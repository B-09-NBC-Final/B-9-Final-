'use client';

import React, { useState } from 'react';
import Defaultimg from '../../../public/image/defaultimg.png';
import Image from 'next/image';
import Link from 'next/link';

const Header = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <header className="flex justify-between items-center p-4 bg-gray-100">
      <Link href={'/'}>
        <div className="text-lg font-bold">Logo</div>
      </Link>
      <nav>
        {isLoggedIn ? (
          <ul className="flex space-x-4">
            <Link href={'/info-detail'}>
              <li>나만의 식단</li>
            </Link>
            <Link href={'/posting-main'}>
              <li>커뮤니티</li>
            </Link>
            <li>
              <button onClick={() => setIsLoggedIn(false)} className="flex items-center">
                <Image
                  src={Defaultimg}
                  alt="profile img"
                  width={50}
                  height={50}
                  className="w-6 h-6 rounded-full mr-2"
                />
                로그아웃
              </button>
            </li>
          </ul>
        ) : (
          <ul className="flex space-x-4">
            <Link href={'/posting-main'}>
              <li>커뮤니티</li>
            </Link>
            <li>
              <Link href={'/login'}>
                <button onClick={() => setIsLoggedIn(true)}>로그인</button>
              </Link>
            </li>
          </ul>
        )}
      </nav>
    </header>
  );
};

export default Header;
