import React from "react";
import "./SignupPage.css";
import Modal from "../components/Modal.jsx";
import { signupUser, validateSignup } from "../utils/auth.js";

const initialValues = {
  username: "",
  password: "",
  confirmPassword: "",
  nickname: "",
  modelGender: "",
  email: "",
};

function SignupPage({ onLogin }) {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = React.useState(false);

  function updateField(field, value) {
    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    if (hasSubmitted) {
      setErrors(validateSignup(nextValues));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setHasSubmitted(true);

    const nextErrors = validateSignup(values);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setIsSubmitting(true);
    const result = await signupUser(values);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors(result.errors);
      return;
    }

    setIsCompleteModalOpen(true);
  }

  function handleCompleteModalClose() {
    setIsCompleteModalOpen(false);
  }

  return (
    <>
      <main className="login-main signup-main">
        <section className="login-panel signup-panel" aria-labelledby="signup-title">
          <h1 id="signup-title">회원가입</h1>
          <form className="login-form signup-form" onSubmit={handleSubmit} noValidate>
            <label>
              <span className="field-heading">
                아이디
                {errors.username && <strong className="field-error">{errors.username}</strong>}
              </span>
              <input
                type="text"
                placeholder="아이디 입력"
                autoComplete="username"
                value={values.username}
                disabled={isSubmitting}
                onChange={(event) => updateField("username", event.target.value)}
                aria-invalid={Boolean(errors.username)}
              />
            </label>
            <label>
              <span className="field-heading">
                비밀번호
                {errors.password && <strong className="field-error">{errors.password}</strong>}
              </span>
              <input
                type="password"
                placeholder="영문, 숫자, 특수문자 포함 8자 이상"
                autoComplete="new-password"
                value={values.password}
                disabled={isSubmitting}
                onChange={(event) => updateField("password", event.target.value)}
                aria-invalid={Boolean(errors.password)}
              />
            </label>
            <label>
              <span className="field-heading">
                비밀번호 확인
                {errors.confirmPassword && <strong className="field-error">{errors.confirmPassword}</strong>}
              </span>
              <input
                type="password"
                placeholder="비밀번호 재입력"
                autoComplete="new-password"
                value={values.confirmPassword}
                disabled={isSubmitting}
                onChange={(event) => updateField("confirmPassword", event.target.value)}
                aria-invalid={Boolean(errors.confirmPassword)}
              />
            </label>
            <label>
              <span className="field-heading">
                닉네임
                {errors.nickname && <strong className="field-error">{errors.nickname}</strong>}
              </span>
              <input
                type="text"
                placeholder="닉네임 입력"
                autoComplete="nickname"
                value={values.nickname}
                disabled={isSubmitting}
                onChange={(event) => updateField("nickname", event.target.value)}
                aria-invalid={Boolean(errors.nickname)}
              />
            </label>
            <fieldset className="signup-radio-field" aria-invalid={Boolean(errors.modelGender)}>
              <span className="field-heading">
                AI 모델 성별
                {errors.modelGender && <strong className="field-error">{errors.modelGender}</strong>}
              </span>
              <div className="signup-radio-options">
                <label className="signup-radio-option">
                  <input
                    type="radio"
                    name="modelGender"
                    value="male"
                    checked={values.modelGender === "male"}
                    disabled={isSubmitting}
                    onChange={(event) => updateField("modelGender", event.target.value)}
                  />
                  <span>남성</span>
                </label>
                <label className="signup-radio-option">
                  <input
                    type="radio"
                    name="modelGender"
                    value="female"
                    checked={values.modelGender === "female"}
                    disabled={isSubmitting}
                    onChange={(event) => updateField("modelGender", event.target.value)}
                  />
                  <span>여성</span>
                </label>
              </div>
            </fieldset>
            <label>
              <span className="field-heading">
                이메일
                {errors.email && <strong className="field-error">{errors.email}</strong>}
              </span>
              <input
                type="email"
                placeholder="example@email.com"
                autoComplete="email"
                value={values.email}
                disabled={isSubmitting}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
            </label>
            {errors.form && <p className="form-error">{errors.form}</p>}
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "가입 중" : "회원가입"}
            </button>
          </form>
          <p className="signup-line">
            이미 계정이 있으신가요?{" "}
            <button className="text-link" type="button" onClick={onLogin}>
              로그인
            </button>
          </p>
        </section>
      </main>
      <Modal
        isOpen={isCompleteModalOpen}
        titleId="signup-complete-title"
        onClose={handleCompleteModalClose}
        onConfirm={onLogin}
      >
        <h2 id="signup-complete-title">회원가입 완료</h2>
        <p>회원가입이 완료되었습니다.</p>
        <button className="modal-button" type="button" onClick={onLogin}>
          확인
        </button>
      </Modal>
    </>
  );
}

export default SignupPage;
