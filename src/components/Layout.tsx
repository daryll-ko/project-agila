import Head from "next/head";
import React, { type ReactNode } from "react";
import Shadow from "./Shadow";

interface Props {
  children: ReactNode;
  shadow?: boolean;
}

export default function Layout({ children, shadow = true }: Props) {
  return (
    <>
      <Head>
        <link rel="icon" href="/favicon.png" />
      </Head>
      <div className="inset absolute z-10 h-full w-full" />
      {/* <Image src={bookshelfbg} fill alt="Bookshelf background image"/> */}
      {shadow ? <Shadow /> : null}
      {children}
    </>
  );
}
