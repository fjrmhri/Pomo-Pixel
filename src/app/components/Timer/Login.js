import Image from "next/image";
import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { signInWithPopup } from "firebase/auth";
import { auth, db, googleProvider } from "../../firebase";
import { redirectToGitHub, getRedirectUriInfo } from "../../github";
import { useToast } from "../ui/useToast";

// Peringatan konfigurasi OAuth hanya ditampilkan saat development.
const MODE_DEV = process.env.NODE_ENV !== "production";

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
        title: "Google login failed",
        description: error?.message || "Please try again in a moment.",
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
          title: "GitHub login is not available",
          description: "GitHub sign-in has not been configured yet.",
          variant: "error",
        });
        return;
      }
      const started = redirectToGitHub();
      if (!started) {
        toast({
          title: "GitHub login failed",
          description: "GitHub authentication could not start.",
          variant: "error",
        });
      }
    } catch (e) {
      console.error(e);
      toast({
        title: "GitHub login failed",
        description: "Something went wrong while starting GitHub login.",
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
    <div className="w-full h-full overflow-y-auto max-w-md mx-auto px-2 pb-2">
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
            className="ui-tombol ui-tombol--blok Sf__btn"
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
                alt=""
                width={18}
                height={18}
                priority
              />
              {sedangMemuat ? "Loading..." : "Log in with Google"}
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
                    className="ui-tombol ui-tombol--blok Sf__btn"
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
                        alt=""
                        width={18}
                        height={18}
                        priority
                      />
                      Log in with GitHub
                    </span>
                  </button>
                  {MODE_DEV && !info.clientIdProvided && (
                    <div className="Sf__catatan-dev">
                      [dev] NEXT_PUBLIC_GITHUB_CLIENT_ID is not set; GitHub
                      OAuth is disabled.
                    </div>
                  )}
                  {MODE_DEV && info.usingFallbackRedirect && (
                    <div className="Sf__catatan-dev">
                      [dev] NEXT_PUBLIC_GITHUB_REDIRECT_URI is not set; using
                      the automatic fallback redirect.
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
