import { usePage } from '@inertiajs/react';

export default function ApplicationLogo({ className, ...rest }) {
    const { props } = usePage();
    const base = props?.app_base || '';
    const src = `${base}/app_logo_transparent.png`;

    return <img src={src} alt="Logo" className={className} {...rest} />;
}

