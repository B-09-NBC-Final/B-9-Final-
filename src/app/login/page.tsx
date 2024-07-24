import React from 'react';
import LoginButton from '@/components/LoginPage/SocialLogin';
import Logout from '@/components/LoginPage/SocialLogout';

const LoginPage = () => {
  return (
    <>
      <div>LoginPage</div>
      <LoginButton />
      <div>Logout</div>
      <Logout />
    </>
  );
};

export default LoginPage;
