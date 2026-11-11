export const NOT_CONFIGURED =
  'الموقع لسه مش متوصل بقاعدة البيانات. ضيف إعدادات Supabase في ملف \u2066.env.local\u2069 (التفاصيل في README).';

export function authErrorMessage(error: { code?: string; message?: string } | null | undefined): string {
  switch (error?.code) {
    case 'invalid_credentials':
      return 'الموبايل أو الإيميل أو كلمة السر مش مظبوطين.';
    case 'email_not_confirmed':
      return 'لازم تأكد الإيميل الأول. افتح الإيميل اللي بعتناه ودوس على اللينك.';
    case 'user_already_exists':
    case 'email_exists':
      return 'الحساب ده متسجل قبل كده، جرّب تسجل دخول.';
    case 'weak_password':
      return 'كلمة السر ضعيفة، خليها أطول شوية وفيها حروف وأرقام.';
    case 'over_request_rate_limit':
    case 'over_email_send_rate_limit':
      return 'محاولات كتير ورا بعض، استنى شوية وجرّب تاني.';
    case 'email_address_invalid':
      return 'الإيميل ده مش مقبول، جرّب إيميل تاني.';
    case 'signup_disabled':
      return 'التسجيل مقفول دلوقتي.';
    case 'same_password':
      return 'كلمة السر الجديدة لازم تكون مختلفة عن القديمة.';
    case 'reauthentication_needed':
      return 'لازم تسجل دخول تاني قبل ما تغيّر كلمة السر.';
    default:
      return 'حصلت مشكلة، جرّب تاني بعد شوية.';
  }
}
