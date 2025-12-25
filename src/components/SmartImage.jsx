import React from 'react';

// Minimal smart image component with a safe fallback and onError handling.
// Some code paths import this as a default export; provide a simple implementation
// that supports `src`, `alt`, `style`, `className`, and `loading` props.
export default function SmartImage({ src, alt = '', style = {}, className = '', loading = 'lazy', ...props }) {
	const [failed, setFailed] = React.useState(false);
	const safeSrc = failed ? '/logo.png' : (src || '/logo.png');
	return (
		<img
			src={safeSrc}
			alt={alt}
			style={style}
			className={className}
			loading={loading}
			onError={() => setFailed(true)}
			{...props}
		/>
	);
}
