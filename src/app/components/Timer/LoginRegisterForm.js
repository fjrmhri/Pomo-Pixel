import Login from "./Login";
import { useEffect, useRef } from "react";
import "../../styles/SettingsForm.css";
import { useToast } from "../ui/useToast";

/**
 * Komponen untuk menampilkan form login gabungan (Google + GitHub)
 */
function LoginRegisterForm({ googleUser, githubUser, onClose }) {
  const prevGoogleLoggedRef = useRef(Boolean(googleUser));
  const prevGithubLoggedRef = useRef(Boolean(githubUser));
  const closeTimeoutRef = useRef(null);
  const { toast } = useToast();

  useEffect(() => {
    const googleLoggedIn = Boolean(googleUser);
    const githubLoggedIn = Boolean(githubUser);
    const googleBaruLogin = googleLoggedIn && !prevGoogleLoggedRef.current;
    const githubBaruLogin = githubLoggedIn && !prevGithubLoggedRef.current;

    if (googleBaruLogin) {
      toast({ title: "Berhasil login Google", variant: "success" });
    }

    if (githubBaruLogin) {
      toast({ title: "Berhasil login GitHub", variant: "success" });
    }

    if (googleBaruLogin || githubBaruLogin) {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
      closeTimeoutRef.current = setTimeout(() => {
        onClose?.();
      }, 1200);
    }

    prevGoogleLoggedRef.current = googleLoggedIn;
    prevGithubLoggedRef.current = githubLoggedIn;
  }, [githubUser, googleUser, onClose, toast]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  if (googleUser && githubUser) return null;

  return (
    <div className="flex flex-col items-center gap-4 w-full h-full overflow-y-auto">
      <Login googleUser={googleUser} githubUser={githubUser} />
    </div>
  );
}

export default LoginRegisterForm;
