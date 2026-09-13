import { formatPhone, isValidEmail, isValidPhone, normalizeEmail } from '../../functions/contactFields.js';

export default function ContactInput({ type, value, onChange, onBlur, ...props }) {
  const phone = type === 'tel';
  function validate(input) {
    const valid = !input.value || (phone ? isValidPhone(input.value) : isValidEmail(input.value));
    input.setCustomValidity(valid ? '' : phone ? 'Informe um telefone com DDD.' : 'Informe um e-mail válido, como nome@caixa.gov.br.');
  }
  return <input {...props} type={type} inputMode={phone ? 'tel' : 'email'} autoComplete={props.autoComplete ?? (phone ? 'tel' : 'email')} value={phone ? formatPhone(value) : value} onChange={event => {
    event.target.value = phone ? formatPhone(event.target.value) : event.target.value;
    validate(event.target); onChange(event);
  }} onBlur={event => {
    if (!phone) { event.target.value = normalizeEmail(event.target.value); onChange(event); }
    validate(event.target); onBlur?.(event);
  }} />;
}
