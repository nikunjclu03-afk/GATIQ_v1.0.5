const crypto = require('crypto');
const os = require('os');
const { execFileSync } = require('child_process');

function normalizeComponent(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^A-Za-z0-9._:\- ]/g, '');

  if (!normalized) return '';

  const blocked = new Set([
    'TO BE FILLED BY O.E.M.',
    'TO BE FILLED BY OEM',
    'DEFAULT STRING',
    'NONE',
    'UNKNOWN',
    'SYSTEM SERIAL NUMBER',
    'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF',
    '00000000-0000-0000-0000-000000000000'
  ]);

  return blocked.has(normalized.toUpperCase()) ? '' : normalized;
}

function getWindowsHardwareSnapshot() {
  const script = [
    "$ErrorActionPreference = 'SilentlyContinue'",
    "$machineGuid = (Get-ItemProperty -Path 'HKLM:\\SOFTWARE\\Microsoft\\Cryptography' -Name 'MachineGuid').MachineGuid",
    "$uuid = (Get-CimInstance Win32_ComputerSystemProduct).UUID",
    "$bios = (Get-CimInstance Win32_BIOS).SerialNumber",
    "$board = (Get-CimInstance Win32_BaseBoard).SerialNumber",
    "$disk = (Get-CimInstance Win32_OperatingSystem).SerialNumber",
    "$payload = [ordered]@{ machineGuid = $machineGuid; systemUuid = $uuid; biosSerial = $bios; baseboardSerial = $board; osSerial = $disk }",
    "$payload | ConvertTo-Json -Compress"
  ].join('; ');

  try {
    const output = execFileSync(
      'powershell.exe',
      ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', script],
      { encoding: 'utf8', timeout: 8000, windowsHide: true }
    );
    return JSON.parse(output || '{}');
  } catch (error) {
    return {
      fallbackError: error.message
    };
  }
}

function buildDeviceId(components) {
  const digest = crypto
    .createHash('sha256')
    .update(components.join('|'), 'utf8')
    .digest('hex')
    .toUpperCase();

  return `GATIQ-${digest.slice(0, 5)}-${digest.slice(5, 10)}-${digest.slice(10, 15)}-${digest.slice(15, 20)}-${digest.slice(20, 25)}`;
}

function getMachineIdentity() {
  const snapshot = process.platform === 'win32' ? getWindowsHardwareSnapshot() : {};
  const rawComponents = [
    snapshot.machineGuid,
    snapshot.systemUuid,
    snapshot.biosSerial,
    snapshot.baseboardSerial,
    snapshot.osSerial,
    os.hostname(),
    os.arch(),
    os.platform()
  ];

  const components = rawComponents.map(normalizeComponent).filter(Boolean);
  if (!components.length) {
    throw new Error('Could not derive a stable machine identity for offline licensing.');
  }

  return {
    deviceId: buildDeviceId(components),
    components
  };
}

module.exports = {
  getMachineIdentity
};
