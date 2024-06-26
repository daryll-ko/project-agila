import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";

export default function Shadow() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    await signOut({});
  };

  return (
    <>
      <div className="absolute z-20 flex w-full flex-row items-center justify-between p-5 text-white">
        <Link href="/rerouter">Project Agila</Link>
        {session ? (
          <div className="flex flex-row items-center gap-6">
            <p>
              Signed in as{" "}
              <span className="text-blue-400">{session.user.name}</span>
              {session.user.isAdmin && <span> (Admin)</span>}
            </p>
            <button className="btn-blue" onClick={handleSignOut}>
              Logout
            </button>
          </div>
        ) : (
          <button className="btn-blue" onClick={() => signIn()}>
            Login
          </button>
        )}
      </div>
    </>
  );
}
