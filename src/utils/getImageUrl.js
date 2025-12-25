import { getImageUrl as namedGetImageUrl } from './imageUrl.js';

// Provide a default export for backwards compatibility with files that
// import the utility as `import getImageUrl from '../utils/getImageUrl.js'`.
export default function getImageUrl(img) {
	return namedGetImageUrl(img);
}

// Also export the named variant for new code.
export { namedGetImageUrl as getImageUrl };
