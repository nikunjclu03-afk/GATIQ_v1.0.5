const path = require('path');

const PRODUCT_NAME = 'GATIQ';
const PRODUCT_CODE = 'gatiq-desktop';
const LICENSE_SCHEMA_VERSION = 1;
const ACTIVATION_STATE_VERSION = 1;
const ACTIVATION_STATIC_SALT = 'gatiq-desktop-offline-license-v1';
const PUBLIC_KEY_PATH = path.join(__dirname, 'public-key.pem');
const PUBLIC_KEY_PLACEHOLDER = 'REPLACE_WITH_REAL_GATIQ_PUBLIC_KEY';

module.exports = {
  ACTIVATION_STATE_VERSION,
  ACTIVATION_STATIC_SALT,
  LICENSE_SCHEMA_VERSION,
  PRODUCT_CODE,
  PRODUCT_NAME,
  PUBLIC_KEY_PATH,
  PUBLIC_KEY_PLACEHOLDER
};
