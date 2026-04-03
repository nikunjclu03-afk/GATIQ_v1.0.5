const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const {
  ACTIVATION_STATE_VERSION,
  ACTIVATION_STATIC_SALT,
  LICENSE_SCHEMA_VERSION,
  PRODUCT_NAME,
  PUBLIC_KEY_PATH,
  PUBLIC_KEY_PLACEHOLDER
} = require('./constants');
const { getMachineIdentity } = require('./hwid');

function canonicalize(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalize(item)).join(',')}]`;
  }

  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
  }

  return JSON.stringify(value);
}

function sha256Base64(value) {
  return crypto.createHash('sha256').update(value).digest('base64');
}

function hmacBase64(key, value) {
  return crypto.createHmac('sha256', key).update(value).digest('base64');
}

function bufferFromBase64(value, label) {
  try {
    return Buffer.from(String(value || '').trim(), 'base64');
  } catch {
    throw new Error(`${label} is not valid Base64.`);
  }
}

function decodeLicensePayload(payload) {
  if (typeof payload !== 'string') {
    throw new Error('License payload is missing.');
  }

  const trimmed = payload.trim();
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.trim().startsWith('{')) {
      return decoded;
    }
  } catch {
    // Fall through to plain JSON mode.
  }

  return trimmed;
}

function ensureIsoDate(value, fieldName) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${fieldName} is not a valid date.`);
  }
  return date.toISOString();
}

function firstDefined(...values) {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return '';
}

function createLicenseService({ app, dialog, safeStorage }) {
  let cachedState = null;

  function ensureStorageDir() {
    const dir = path.join(app.getPath('userData'), 'licensing');
    fs.mkdirSync(dir, { recursive: true });
    return dir;
  }

  function getActivationFile() {
    return path.join(ensureStorageDir(), 'activation.json');
  }

  function getPublicKey() {
    const key = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    if (!key.includes('BEGIN PUBLIC KEY') || key.includes(PUBLIC_KEY_PLACEHOLDER)) {
      throw new Error(`Embedded public key is not configured at ${PUBLIC_KEY_PATH}. Replace the placeholder with your production public key.`);
    }
    return key;
  }

  function getIntegrityKey(deviceId) {
    return crypto
      .createHash('sha256')
      .update(`${deviceId}|${ACTIVATION_STATIC_SALT}|${app.getName()}`)
      .digest();
  }

  function extractEnvelope(rawText) {
    let parsed;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      throw new Error('License file is not valid JSON.');
    }

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('License file has an invalid structure.');
    }

    if (parsed.payload && parsed.signature) {
      const payloadText = decodeLicensePayload(parsed.payload);
      return {
        payloadText,
        payload: JSON.parse(payloadText),
        signature: String(parsed.signature || '').trim()
      };
    }

    if (parsed.license && parsed.signature) {
      const payload = parsed.license;
      return {
        payloadText: canonicalize(payload),
        payload,
        signature: String(parsed.signature || '').trim()
      };
    }

    const payload = { ...parsed };
    const signature = String(payload.signature || '').trim();
    delete payload.signature;
    return {
      payloadText: canonicalize(payload),
      payload,
      signature
    };
  }

  function normalizeLicensePayload(payload, deviceId) {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('License payload is invalid.');
    }

    const product = String(firstDefined(payload.product, payload.productName, payload.product_name)).trim();
    const hwid = String(firstDefined(payload.hwid, payload.deviceId, payload.device_id)).trim();
    const licenseId = String(firstDefined(payload.licenseId, payload.license_id, payload.id)).trim();
    const issuedAt = ensureIsoDate(firstDefined(payload.issuedAt, payload.issued_at), 'issuedAt');
    const expiresAt = ensureIsoDate(firstDefined(payload.expiresAt, payload.expires_at), 'expiresAt');
    const schemaVersion = Number(firstDefined(payload.schemaVersion, payload.schema_version, LICENSE_SCHEMA_VERSION));

    if (!product) throw new Error('License product is missing.');
    if (product !== PRODUCT_NAME) throw new Error(`License product mismatch. Expected ${PRODUCT_NAME}.`);
    if (!licenseId) throw new Error('License ID is missing.');
    if (!hwid) throw new Error('License HWID / Device ID is missing.');
    if (hwid !== deviceId) throw new Error('License was generated for a different machine.');
    if (!issuedAt) throw new Error('License issue date is missing.');
    if (!Number.isFinite(schemaVersion) || schemaVersion < 1) {
      throw new Error('License schema version is invalid.');
    }
    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
      throw new Error('License has expired.');
    }

    return {
      ...payload,
      schemaVersion,
      product,
      hwid,
      licenseId,
      issuedAt,
      expiresAt,
      issuedTo: String(firstDefined(payload.issuedTo, payload.issued_to, payload.customerName, payload.customer_name)).trim()
    };
  }

  function verifyDetachedSignature(payloadText, publicKey, signatureBuffer) {
    const publicKeyObject = crypto.createPublicKey(publicKey);
    const keyType = publicKeyObject.asymmetricKeyType;

    // Ed25519/Ed448 use a pure signature scheme and must not be forced through RSA hashing modes.
    if (keyType === 'ed25519' || keyType === 'ed448') {
      return crypto.verify(null, Buffer.from(payloadText, 'utf8'), publicKeyObject, signatureBuffer);
    }

    // Preserve RSA compatibility for existing generators that sign canonical JSON with SHA-256.
    return crypto.verify('RSA-SHA256', Buffer.from(payloadText, 'utf8'), publicKeyObject, signatureBuffer);
  }

  function verifyLicenseText(rawText, machineIdentity) {
    const publicKey = getPublicKey();
    const { payload, payloadText, signature } = extractEnvelope(rawText);
    const normalized = normalizeLicensePayload(payload, machineIdentity.deviceId);

    if (!signature) {
      throw new Error('License signature is missing.');
    }

    const signatureBuffer = bufferFromBase64(signature, 'License signature');

    // Verify only with the embedded public key. The private signing key never ships with the app.
    const isValidSignature = verifyDetachedSignature(payloadText, publicKey, signatureBuffer);

    if (!isValidSignature) {
      throw new Error('Digital signature verification failed.');
    }

    return {
      normalized,
      payloadText
    };
  }

  function sealLicense(rawText) {
    const safeStorageAvailable = safeStorage.isEncryptionAvailable();
    if (!safeStorageAvailable) {
      return {
        safeStorageAvailable,
        sealedLicense: Buffer.from(rawText, 'utf8').toString('base64')
      };
    }

    return {
      safeStorageAvailable,
      sealedLicense: safeStorage.encryptString(rawText).toString('base64')
    };
  }

  function unsealLicense(record) {
    if (!record?.sealedLicense) {
      throw new Error('Activation record is missing the sealed license.');
    }

    if (record.safeStorageAvailable) {
      if (!safeStorage.isEncryptionAvailable()) {
        throw new Error('Activation record requires OS secure storage, but it is unavailable.');
      }
      return safeStorage.decryptString(Buffer.from(record.sealedLicense, 'base64'));
    }

    return Buffer.from(record.sealedLicense, 'base64').toString('utf8');
  }

  function buildActivationRecord(rawText, machineIdentity, license) {
    const { safeStorageAvailable, sealedLicense } = sealLicense(rawText);
    const baseRecord = {
      version: ACTIVATION_STATE_VERSION,
      activatedAt: new Date().toISOString(),
      deviceId: machineIdentity.deviceId,
      safeStorageAvailable,
      licenseHash: sha256Base64(rawText),
      sealedLicense,
      summary: {
        product: license.product,
        hwid: license.hwid,
        licenseId: license.licenseId,
        issuedAt: license.issuedAt,
        expiresAt: license.expiresAt || null,
        issuedTo: license.issuedTo || ''
      }
    };

    const integrityPayload = canonicalize(baseRecord);
    return {
      ...baseRecord,
      integrity: hmacBase64(getIntegrityKey(machineIdentity.deviceId), integrityPayload)
    };
  }

  function persistActivationRecord(record) {
    fs.writeFileSync(getActivationFile(), JSON.stringify(record, null, 2), 'utf8');
  }

  function readActivationRecord() {
    const file = getActivationFile();
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  }

  function validateActivationRecord(record, machineIdentity) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      throw new Error('Activation record is invalid.');
    }

    if (record.deviceId !== machineIdentity.deviceId) {
      throw new Error('Activation record belongs to a different machine.');
    }

    const { integrity, ...unsignedRecord } = record;
    const expectedIntegrity = hmacBase64(
      getIntegrityKey(machineIdentity.deviceId),
      canonicalize(unsignedRecord)
    );

    // This integrity check is machine-bound to make casual file editing/copying much harder.
    if (!integrity || integrity !== expectedIntegrity) {
      throw new Error('Activation record integrity check failed.');
    }

    const rawText = unsealLicense(record);
    if (sha256Base64(rawText) !== record.licenseHash) {
      throw new Error('Stored license hash does not match the activation record.');
    }

    const { normalized } = verifyLicenseText(rawText, machineIdentity);
    return {
      rawText,
      normalized
    };
  }

  async function buildState() {
    const machineIdentity = getMachineIdentity();

    try {
      const publicKeyLoaded = Boolean(getPublicKey());
      const activationRecord = readActivationRecord();

      if (!activationRecord) {
        return {
          isActivated: false,
          deviceId: machineIdentity.deviceId,
          status: 'locked',
          message: 'This installation is not activated yet. Import a valid license.dat for this machine.'
        };
      }

      const { normalized } = validateActivationRecord(activationRecord, machineIdentity);
      return {
        isActivated: true,
        deviceId: machineIdentity.deviceId,
        status: 'activated',
        message: 'License activated for this machine.',
        publicKeyLoaded,
        license: {
          licenseId: normalized.licenseId,
          issuedTo: normalized.issuedTo || '',
          issuedAt: normalized.issuedAt,
          expiresAt: normalized.expiresAt || null,
          product: normalized.product
        }
      };
    } catch (error) {
      return {
        isActivated: false,
        deviceId: machineIdentity.deviceId,
        status: 'invalid',
        message: error.message
      };
    }
  }

  async function getActivationState(forceRefresh = false) {
    if (!cachedState || forceRefresh) {
      cachedState = await buildState();
    }
    return cachedState;
  }

  async function assertLicensed() {
    const state = await getActivationState(true);
    if (!state.isActivated) {
      throw new Error(state.message || 'GATIQ is not activated on this machine.');
    }
    return state;
  }

  async function selectLicenseFile(browserWindow) {
    const result = await dialog.showOpenDialog(browserWindow || null, {
      title: 'Select GATIQ license.dat',
      buttonLabel: 'Import License',
      properties: ['openFile'],
      filters: [
        { name: 'GATIQ License', extensions: ['dat', 'json'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });

    return {
      canceled: result.canceled,
      filePath: result.filePaths?.[0] || ''
    };
  }

  async function activateFromFile(filePath) {
    const normalizedPath = path.resolve(String(filePath || '').trim());
    if (!normalizedPath || !fs.existsSync(normalizedPath)) {
      throw new Error('Selected license.dat file could not be found.');
    }

    const rawText = fs.readFileSync(normalizedPath, 'utf8').trim();
    if (!rawText) {
      throw new Error('Selected license.dat file is empty.');
    }

    const machineIdentity = getMachineIdentity();
    const { normalized } = verifyLicenseText(rawText, machineIdentity);
    const record = buildActivationRecord(rawText, machineIdentity, normalized);

    persistActivationRecord(record);
    cachedState = null;
    return getActivationState(true);
  }

  async function clearActivation() {
    const activationFile = getActivationFile();
    if (fs.existsSync(activationFile)) {
      fs.unlinkSync(activationFile);
    }
    cachedState = null;
    return getActivationState(true);
  }

  return {
    activateFromFile,
    assertLicensed,
    clearActivation,
    getActivationState,
    selectLicenseFile
  };
}

module.exports = {
  createLicenseService
};
