/**
 * safeUUID — crypto.randomUUID() ka safe wrapper.
 *
 * crypto.randomUUID() sirf "secure contexts" mein kaam karta hai:
 *   ✅ localhost
 *   ✅ https://
 *   ❌ http://192.168.x.x  (local network IP)
 *
 * Yeh function automatically fallback use karta hai jab zaroorat ho.
 */
export const safeUUID = () => {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return crypto.randomUUID();
    }
    // Fallback: RFC-4122 v4 UUID using Math.random
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
};
