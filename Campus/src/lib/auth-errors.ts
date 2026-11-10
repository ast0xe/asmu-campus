export function authErrorText(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Неверный email или пароль";
  if (m.includes("email not confirmed")) return "Почта не подтверждена — проверь письмо";
  if (m.includes("already registered") || m.includes("user already exists")) return "Этот email уже зарегистрирован";
  if (m.includes("password should be at least")) return "Пароль слишком короткий (минимум 6 символов)";
  if (m.includes("rate limit")) return "Слишком много попыток — подожди немного";
  return message;
}
