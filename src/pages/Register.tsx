import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Seo } from "../components/common/Seo";
import { setSession } from "../lib/session";
import styles from "../styles/register.module.css";

type FormState = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  country: string;
  acceptTerms: boolean;
};

type FormErrors = Partial<Record<keyof FormState, string>> & { form?: string };

const initialState: FormState = {
  fullName: "",
  email: "",
  password: "",
  confirmPassword: "",
  country: "Indonesia",
  acceptTerms: false,
};

function validate(state: FormState): FormErrors {
  const e: FormErrors = {};

  if (!state.fullName.trim()) e.fullName = "Nama lengkap wajib diisi.";
  if (!state.email.trim()) e.email = "Email wajib diisi.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(state.email)) e.email = "Format email tidak valid.";

  if (!state.password) e.password = "Password wajib diisi.";
  else if (state.password.length < 8) e.password = "Minimal 8 karakter.";

  if (!state.confirmPassword) e.confirmPassword = "Konfirmasi password wajib diisi.";
  else if (state.confirmPassword !== state.password) e.confirmPassword = "Password tidak sama.";

  if (!state.acceptTerms) e.acceptTerms = "Kamu harus menyetujui ketentuan.";

  return e;
}

async function fakeRegister(state: FormState): Promise<{ ok: true } | { ok: false; error: string }> {
  await new Promise((r) => setTimeout(r, 900));
  if (state.email.toLowerCase().endsWith("@example.com")) {
    return { ok: false, error: "Email domain tidak diizinkan. Gunakan email asli." };
  }
  return { ok: true };
}

export function Register() {
  const navigate = useNavigate();
  const [state, setState] = useState<FormState>(initialState);
  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

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
    setDone(false);
    const e = validate(state);
    if (Object.keys(e).length > 0) {
      setErrors(e);
      return;
    }
    setLoading(true);
    setErrors({});
    const res = await fakeRegister(state).catch(() => ({ ok: false as const, error: "Network error. Try again." }));
    setLoading(false);
    if (!res.ok) {
      setErrors({ form: res.error });
      return;
    }
    setDone(true);
    setSession({ email: state.email, fullName: state.fullName });
    setTimeout(() => navigate("/dashboard", { replace: true }), 700);
  };

  return (
    <main className={styles.page}>
      <Seo
        title="Get Started — WongBanter Capital"
        description="Register to start evaluation with institutional execution, risk intelligence, and real-time monitoring."
      />

      <div className={styles.shell}>
        <div className={styles.left}>
          <div className={styles.kicker}>WongBanter Capital</div>
          <h1 className={styles.title}>Start your evaluation</h1>
          <p className={styles.sub}>
            Buat akun untuk akses program capital dan fitur monitoring. Ini contoh form yang bisa dihubungkan ke backend kapan saja.
          </p>
          <div className={styles.sideCard}>
            <div className={styles.sideRow}>
              <span className={styles.sideK}>Track</span>
              <span className={styles.sideV}>Portfolio monitoring</span>
            </div>
            <div className={styles.sideRow}>
              <span className={styles.sideK}>Risk</span>
              <span className={styles.sideV}>Clear rules & guardrails</span>
            </div>
            <div className={styles.sideRow}>
              <span className={styles.sideK}>Execution</span>
              <span className={styles.sideV}>Institutional workflow</span>
            </div>
          </div>
          <Link className={styles.back} to="/">
            ← Back to Landing
          </Link>
        </div>

        <div className={styles.formWrap}>
          <form className={styles.form} onSubmit={onSubmit} noValidate>
            <div className={styles.formHead}>
              <div>
                <div className={styles.formTitle}>Create your account</div>
                <div className={styles.formSub}>Fill details below. We’ll keep it clean and minimal.</div>
              </div>
              <div className={styles.pill}>{loading ? "Processing…" : done ? "Success" : "Secure"}</div>
            </div>

            {errors.form ? <div className={styles.formError}>{errors.form}</div> : null}
            {done ? <div className={styles.formOk}>Account created. Redirecting to Dashboard…</div> : null}

            <label className={styles.field}>
              <span className={styles.label}>Full name</span>
              <input
                className={styles.input}
                value={state.fullName}
                onChange={(e) => onChange("fullName", e.target.value)}
                placeholder="Nama lengkap"
                autoComplete="name"
                disabled={loading}
              />
              {errors.fullName ? <span className={styles.err}>{errors.fullName}</span> : null}
            </label>

            <label className={styles.field}>
              <span className={styles.label}>Email</span>
              <input
                className={styles.input}
                value={state.email}
                onChange={(e) => onChange("email", e.target.value)}
                placeholder="you@domain.com"
                autoComplete="email"
                inputMode="email"
                disabled={loading}
              />
              {errors.email ? <span className={styles.err}>{errors.email}</span> : null}
            </label>

            <div className={styles.row}>
              <label className={styles.field}>
                <span className={styles.label}>Password</span>
                <input
                  className={styles.input}
                  value={state.password}
                  onChange={(e) => onChange("password", e.target.value)}
                  placeholder="Min. 8 characters"
                  autoComplete="new-password"
                  type="password"
                  disabled={loading}
                />
                {errors.password ? <span className={styles.err}>{errors.password}</span> : null}
              </label>

              <label className={styles.field}>
                <span className={styles.label}>Confirm</span>
                <input
                  className={styles.input}
                  value={state.confirmPassword}
                  onChange={(e) => onChange("confirmPassword", e.target.value)}
                  placeholder="Repeat password"
                  autoComplete="new-password"
                  type="password"
                  disabled={loading}
                />
                {errors.confirmPassword ? <span className={styles.err}>{errors.confirmPassword}</span> : null}
              </label>
            </div>

            <label className={styles.field}>
              <span className={styles.label}>Country</span>
              <select
                className={styles.input}
                value={state.country}
                onChange={(e) => onChange("country", e.target.value)}
                disabled={loading}
              >
                <option>Indonesia</option>
                <option>Singapore</option>
                <option>Malaysia</option>
                <option>United Kingdom</option>
                <option>United States</option>
              </select>
            </label>

            <label className={styles.check}>
              <input
                type="checkbox"
                checked={state.acceptTerms}
                onChange={(e) => onChange("acceptTerms", e.target.checked)}
                disabled={loading}
              />
              <span>
                Saya setuju dengan <span className={styles.linkLike}>Terms</span> dan <span className={styles.linkLike}>Risk disclosure</span>.
              </span>
            </label>
            {errors.acceptTerms ? <div className={styles.err}>{errors.acceptTerms}</div> : null}

            <button className={styles.submit} type="submit" disabled={!canSubmit}>
              {loading ? "Creating…" : "Create account"}
            </button>

            <div className={styles.foot}>
              Sudah punya akun? <Link to="/track">Track My Portfolio</Link>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
