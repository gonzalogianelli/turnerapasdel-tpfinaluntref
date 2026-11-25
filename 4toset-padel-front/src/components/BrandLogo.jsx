import logoUrl from '../assets/logo-4to-set-padel.png';

export function BrandLogo({ className = '', alt = '4to set padel' }) {
  return <img src={logoUrl} alt={alt} className={`brand-logo ${className}`.trim()} />;
}
