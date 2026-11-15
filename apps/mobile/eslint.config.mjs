import base from '../../eslint.config.mjs';

export default [...base, { ignores: ['.expo/**', 'expo-env.d.ts', 'dist/**'] }];
