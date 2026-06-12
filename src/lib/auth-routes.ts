/** Clerk auth path sets for English and Spanish campaign routes. */
export type AuthFlowPaths = {
  signInPath: string;
  signUpPath: string;
  defaultHomePath: string;
};

export const EN_AUTH_PATHS: AuthFlowPaths = {
  signInPath: '/login',
  signUpPath: '/signup',
  defaultHomePath: '/home',
};

export const ES_AUTH_PATHS: AuthFlowPaths = {
  signInPath: '/es/login',
  signUpPath: '/es/signup',
  defaultHomePath: '/es/home',
};
