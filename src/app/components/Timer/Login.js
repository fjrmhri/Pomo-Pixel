import Image from "next/image";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../../firebase";
import { redirectToGitHub, getRedirectUriInfo } from "../../github";
import { useToast } from "../ui/useToast";

function Login({ googleUser, githubUser }) {
  const [sedangMemuat, setSedangMemuat] = useState(false);
  const { toast } = useToast();

  const handleLoginGoogle = async () => {
    setSedangMemuat(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result?.user;

      if (user) {
        const nama = user.displayName || user.email || "Pengguna";
        await setDoc(
          doc(db, "users", user.uid),
          {
            name: nama,
            email: user.email || "",
            updatedAt: new Date(),
          },
          { merge: true },
        );
      }
    } catch (error) {
      console.error("Login: gagal login pengguna:", error);
      toast({
        title: "Login Google gagal",
        description: error?.message || "Coba lagi beberapa saat.",
        variant: "error",
      });
    } finally {
      setSedangMemuat(false);
    }
  };

  const handleLoginGitHub = () => {
    try {
      const info = getRedirectUriInfo();
      if (!info.clientIdProvided) {
        console.warn(
          "[Login] NEXT_PUBLIC_GITHUB_CLIENT_ID tidak ditemukan saat login GitHub dipicu",
        );
        toast({
          title: "GitHub OAuth belum aktif",
          description: "NEXT_PUBLIC_GITHUB_CLIENT_ID belum disetel.",
          variant: "error",
        });
        return;
      }
      const started = redirectToGitHub();
      if (!started) {
        toast({
          title: "Login GitHub gagal",
          description: "Otentikasi GitHub tidak dapat dimulai.",
          variant: "error",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "Login GitHub gagal",
        description: "Terjadi masalah saat memulai login GitHub.",
        variant: "error",
      });
    }
  };

  const namaTerhubung =
    (googleUser &&
      (googleUser.displayName || googleUser.email || "Pengguna")) ||
    (githubUser && (githubUser.name || githubUser.login));

  // If both providers are connected, no need to show login menu
  if (googleUser && githubUser) {
    return null;
  }

  return (
    <div className="pixel-card pixel-card--borderless w-full h-full overflow-y-auto max-w-md mx-auto p-6">
      <div className="Sf__section-title">Login</div>
      <div className="flex flex-col gap-4">
        <div
          className="text-sm text-center"
          style={{ color: "var(--overlay-foreground)" }}
        >
          {namaTerhubung ? `Logged in as: ${namaTerhubung}` : ""}
        </div>

        {/* Show only necessary buttons based on state */}
        {!googleUser && (
          <button
            type="button"
            onClick={handleLoginGoogle}
            className="Sf__btn Sf__btn--primary w-full mt-2"
            disabled={sedangMemuat}
          >
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <Image
                src="/images/login.png"
                alt="ikon login"
                width={18}
                height={18}
                priority
              />
              {sedangMemuat ? "Loading..." : "Login with Google"}
            </span>
          </button>
        )}

        {!githubUser && (
          <>
            {(() => {
              const info = getRedirectUriInfo();
              return (
                <>
                  <button
                    type="button"
                    onClick={handleLoginGitHub}
                    className="Sf__btn Sf__btn--secondary w-full mt-2"
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                      }}
                    >
                      <Image
                        src="/images/github.png"
                        alt="ikon github"
                        width={18}
                        height={18}
                        priority
                      />
                      Login with GitHub
                    </span>
                  </button>
                  {!info.clientIdProvided && (
                    <div className="text-xs text-center text-yellow-400 mt-2">
                      NEXT_PUBLIC_GITHUB_CLIENT_ID belum disetel; OAuth akan
                      dinonaktifkan.
                    </div>
                  )}
                  {info.usingFallbackRedirect && (
                    <div className="text-xs text-center text-yellow-400 mt-2">
                      NEXT_PUBLIC_GITHUB_REDIRECT_URI belum disetel; memakai
                      fallback redirect otomatis.
                    </div>
                  )}
                </>
              );
            })()}
          </>
        )}
      </div>
    </div>
  );
}

export default Login;
