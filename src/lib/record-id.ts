// Standard ID allocator for new app records. Keep the returned ID for retries
// and references; authorization comes from the native API's current owner.
export { newRecordId } from '../../vendor/valance-sdk/src/record-identity';
