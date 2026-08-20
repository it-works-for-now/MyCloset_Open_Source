import React from "react";
import "./LoginPage.css";
import { loginUser } from "../utils/auth.js";

const initialValues = {
  username: "",
  password: "",
};

function LoginPage({ onLogin, onSignup }) {
  const [values, setValues] = React.useState(initialValues);
  const [error, setError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }));
    setError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!values.username.trim() || !values.password.trim()) {
      setError("아이디와 비밀번호를 모두 입력해주세요.");
      return;
    }

    setIsSubmitting(true);
    const result = await loginUser(values);
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    onLogin(result.user);
  }

  return (
    <main className="login-main">
      <section className="login-panel" aria-labelledby="login-title">
        <h1 id="login-title">로그인</h1>
        <form className="login-form" onSubmit={handleSubmit} noValidate>
          <label>
            <span>아이디</span>
            <input
              type="text"
              placeholder="아이디 입력"
              autoComplete="username"
              value={values.username}
              disabled={isSubmitting}
              onChange={(event) => updateField("username", event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </label>
          <label>
            <span>비밀번호</span>
            <input
              type="password"
              placeholder="비밀번호 입력"
              autoComplete="current-password"
              value={values.password}
              disabled={isSubmitting}
              onChange={(event) => updateField("password", event.target.value)}
              aria-invalid={Boolean(error)}
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="submit-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "로그인 중" : "로그인"}
          </button>
        </form>
        <p className="signup-line">
          계정이 없으신가요?{" "}
          <button className="text-link" type="button" onClick={onSignup}>
            회원가입
          </button>
        </p>
      </section>
    </main>
  );
}

export default LoginPage;
