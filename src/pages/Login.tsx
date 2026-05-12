import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import { Seo } from "../components/common/Seo";
import { setSession } from "../lib/session";
import styles from "../styles/register.module.css";

type FormState = {
  email: string;
  password: string;
};

type FormErrors = Partial<Record<keyof FormState, string>> & { form?: string };

const initialState: FormState = {
  email: "",
  password: "",
};

function validate(state: FormState): FormErrors {
  const e: FormErrors = {};
  if (!state.email.trim()) e.email = "Email wajib diisi.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.email = "Format email tidak valid.";
  if (!state.password) e.password = "Password wajib diisi.";
  return e;
}

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);

  const canSubmit = useMemo(() => !loading, [loading]);

  const onChange = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setState((s) => ({ ...s, [key]: value }));
    setErrors((e) => {
      if (!e[key]) return e;
      const next = { ...e };
      delete next[key];
      return next;
    });
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate(state);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    setErrors({});
    await new Promise((r) => setTimeout(r, 350));
    setSession({ email: state.email });
    setLoading(false);
    const target = (location.state as { from?: string } | null)?.from;
    navigate(typeof target === "string" && target.startsWith("/") ? target : "/dashboard", { replace: true });
  };

  return (
    <main className={styles.page}>
      <Seo title="Login — WongBanter Capital" description="Login untuk akses dashboard." />

      <div className={styles.shell}>
        <div className={styles.left}>
          <div className={styles.kicker}>WongBanter Dashboard</div>
          <h1 className={styles.title}>Login</h1>
          <p className={styles.sub}>Masuk untuk mengakses dashboard dan fitur tracking.</p>
          <a className={styles.back} href="https://wongbantercapital.com/">
            ← Back to Landing
          </a>
        </div>

        <div className={styles.formWrap}>
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.formHead}>
              <div>
                <div className={styles.formTitle}>Access dashboard</div>
                <div className={styles.formSub}>Gunakan email & password kamu.</div>
              </div>
              <div className={styles.pill}>{loading ? "Processing…" : "Secure"}</div>
            </div>

            {errors.form ? <div className={styles.formError}>{errors.form}</div> : null}

            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                value={state.email}
                onChange={(e) => onChange("email", e.target.value)}
                autoComplete="email"
                inputMode="email"
                className={styles.input}
                placeholder="you@email.com"
              />
              {errors.email ? <span className={styles.err}>{errors.email}</span> : null}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Password</span>
              <input
                value={state.password}
                onChange={(e) => onChange("password", e.target.value)}
                autoComplete="current-password"
                type="password"
                className={styles.input}
                placeholder="••••••••"
              />
              {errors.password ? <span className={styles.err}>{errors.password}</span> : null}
            </label>

            <button className={styles.submit} type="submit" disabled={!canSubmit}>
              {loading ? "Signing in…" : "Login"}
            </button>

            <div className={styles.alt}>
              Belum punya akun? <Link to="/register">Register</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
