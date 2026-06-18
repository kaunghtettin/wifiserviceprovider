import { usePage } from '@inertiajs/react';

export default function ApplicationLogo({ className, style, ...rest }) {
    const { props } = usePage();
    const base = props?.app_base || '';
    const src = `${base}/app_logo_transparent.png`;

    return (
        <img
            src={src}
            alt="Super Excellent Wifi Solutions"
            className={className}
            style={{ backgroundColor: '#ffffff', borderRadius: 8, ...style }}
            {...rest}
        />
    );
}
