import React from "react";
import Modal from "../components/Modal.jsx";
import {
  deleteCurrentUser,
  updateCurrentUserProfile,
  verifyCurrentPassword,
  validateProfile,
} from "../utils/auth.js";
import "./MyPage.css";

function getInitialValues(user) {
  return {
    username: user?.id || "",
    currentPassword: "",
    password: "",
    confirmPassword: "",
    nickname: user?.nickname || "",
    modelGender: user?.modelGender || "",
    email: user?.email || "",
  };
}

function MyPage({ user, onLogin, onUpdated, onDeleted }) {
  const [values, setValues] = React.useState(() => getInitialValues(user));
  const [errors, setErrors] = React.useState({});
  const [isEditing, setIsEditing] = React.useState(false);
  const [isPasswordCheckOpen, setIsPasswordCheckOpen] = React.useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = React.useState(false);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [notice, setNotice] = React.useState("");
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isUpdateCompleteModalOpen, setIsUpdateCompleteModalOpen] = React.useState(false);
  const [isNoChangeModalOpen, setIsNoChangeModalOpen] = React.useState(false);
  const [updateFailMessage, setUpdateFailMessage] = React.useState("");
  const [deleteResult, setDeleteResult] = React.useState({
    isOpen: false,
    isSuccess: false,
    message: "",
  });

  React.useEffect(() => {
    setValues(getInitialValues(user));
    setErrors({});
    setIsEditing(false);
    setIsPasswordCheckOpen(false);
    setIsPasswordEditing(false);
    setHasSubmitted(false);
    setNotice("");
    setIsNoChangeModalOpen(false);
  }, [user]);

  function hasProfileChanges() {
    const savedNickname = user?.nickname || "";
    const savedEmail = (user?.email || "").trim().toLowerCase();
    const savedModelGender = user?.modelGender || "";
    const nextNickname = values.nickname.trim();
    const nextEmail = values.email.trim().toLowerCase();
    const nextModelGender = values.modelGender;
    const hasPasswordChange = isPasswordEditing && Boolean(values.password.trim());

    return (
      savedNickname !== nextNickname ||
      savedEmail !== nextEmail ||
      savedModelGender !== nextModelGender ||
      hasPasswordChange
    );
  }

  function updateField(field, value) {
    if (field === "currentPassword" && (!isPasswordCheckOpen || isPasswordEditing)) {
      return;
    }

    if ((field === "password" || field === "confirmPassword") && !isPasswordEditing) {
      return;
    }

    const nextValues = { ...values, [field]: value };
    setValues(nextValues);

    if (hasSubmitted) {
      setErrors(validateProfile(nextValues));
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!isEditing) {
      setIsEditing(true);
      setIsPasswordCheckOpen(false);
      setIsPasswordEditing(false);
      setNotice("");
      return;
    }

    setHasSubmitted(true);
    const nextErrors = validateProfile(values);

    if (isPasswordEditing) {
      if (!values.password.trim()) {
        nextErrors.password = "새 비밀번호를 입력해주세요.";
      }

      if (!values.confirmPassword.trim()) {
        nextErrors.confirmPassword = "새 비밀번호 확인을 입력해주세요.";
      }
    }

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    if (!hasProfileChanges()) {
      setValues(getInitialValues(user));
      setErrors({});
      setHasSubmitted(false);
      setIsEditing(false);
      setIsPasswordCheckOpen(false);
      setIsPasswordEditing(false);
      setNotice("");
      setIsNoChangeModalOpen(true);
      return;
    }

    setIsSubmitting(true);
    const result = await updateCurrentUserProfile(values);
    setIsSubmitting(false);

    if (!result.ok) {
      const nextErrors = result.errors || {};
      setErrors(nextErrors);
      setUpdateFailMessage(
        nextErrors.form ||
          nextErrors.nickname ||
          nextErrors.modelGender ||
          "회원정보가 정상적으로 수정되지 않았습니다. 다시 시도해 주십시오."
      );
      return;
    }

    onUpdated(result.user);
    setValues(getInitialValues(result.user));
    setErrors({});
    setHasSubmitted(false);
    setIsEditing(false);
    setIsPasswordCheckOpen(false);
    setIsPasswordEditing(false);
    setNotice("");
    setIsUpdateCompleteModalOpen(true);
  }

  function handleCurrentPasswordKeyDown(event) {
    if (event.key !== "Enter" || isPasswordEditing) {
      return;
    }

    event.preventDefault();
    handleVerifyCurrentPassword();
  }

  function refreshAfterProfileUpdate() {
    window.location.reload();
  }

  async function handleVerifyCurrentPassword() {
    if (!values.currentPassword.trim()) {
      setErrors((current) => ({
        ...current,
        currentPassword: "현재 비밀번호를 입력해주세요.",
      }));
      return;
    }

    setIsSubmitting(true);
    const result = await verifyCurrentPassword(values.currentPassword);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrors((current) => ({
        ...current,
        ...(result.errors || { currentPassword: "현재 비밀번호가 일치하지 않습니다." }),
      }));
      return;
    }

    setErrors((current) => ({
      ...current,
      currentPassword: "",
      password: "",
      confirmPassword: "",
    }));
    setValues((current) => ({
      ...current,
      password: "",
      confirmPassword: "",
    }));
    setIsPasswordEditing(true);
  }

  async function handleDeleteConfirm() {
    setIsSubmitting(true);
    const result = await deleteCurrentUser();
    setIsSubmitting(false);
    setIsDeleteModalOpen(false);

    if (!result.ok) {
      setDeleteResult({
        isOpen: true,
        isSuccess: false,
        message: result.message || "다시 시도해 주십시오.",
      });
      return;
    }

    setDeleteResult({
      isOpen: true,
      isSuccess: true,
      message: "회원 탈퇴가 완료되었습니다.",
    });
  }

  function handleDeleteResultConfirm() {
    const shouldLeave = deleteResult.isSuccess;

    setDeleteResult({
      isOpen: false,
      isSuccess: false,
      message: "",
    });

    if (shouldLeave) {
      onDeleted();
    }
  }

  if (!user) {
    return (
      <main className="mypage-main">
        <section className="login-panel signup-panel mypage-panel" aria-labelledby="mypage-title">
          <h1 id="mypage-title">마이페이지</h1>
          <p className="mypage-login-message">로그인이 필요합니다.</p>
          <button className="submit-button" type="button" onClick={onLogin}>
            로그인
          </button>
        </section>
      </main>
    );
  }

  return (
    <>
      <main className="mypage-main">
        <section className="login-panel signup-panel mypage-panel" aria-labelledby="mypage-title">
          <h1 id="mypage-title">마이페이지</h1>
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
                readOnly
                disabled={isSubmitting}
                onChange={(event) => updateField("username", event.target.value)}
                aria-invalid={Boolean(errors.username)}
              />
            </label>
            <div className="signup-form-field">
              <span className="field-heading">비밀번호</span>
              <div className="mypage-password-section">
                {isPasswordCheckOpen && (
                  <label className="mypage-password-inner-field">
                    <span className="field-heading">
                      현재 비밀번호
                      {errors.currentPassword && (
                        <strong className="field-error">{errors.currentPassword}</strong>
                      )}
                    </span>
                    <input
                      type="password"
                      placeholder="현재 비밀번호 입력"
                      autoComplete="current-password"
                      value={values.currentPassword}
                      readOnly={isPasswordEditing}
                      disabled={isSubmitting}
                      onChange={(event) => updateField("currentPassword", event.target.value)}
                      onKeyDown={handleCurrentPasswordKeyDown}
                      aria-invalid={Boolean(errors.currentPassword)}
                    />
                    {!isPasswordEditing && (
                      <div className="mypage-password-check-actions">
                        <button
                          className="mypage-password-cancel-button"
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => {
                            setIsPasswordCheckOpen(false);
                            setIsPasswordEditing(false);
                            setValues((current) => ({
                              ...current,
                              currentPassword: "",
                              password: "",
                              confirmPassword: "",
                            }));
                            setErrors((current) => ({
                              ...current,
                              currentPassword: "",
                              password: "",
                              confirmPassword: "",
                            }));
                          }}
                        >
                          취소
                        </button>
                        <button
                          className="mypage-password-button"
                          type="button"
                          disabled={isSubmitting}
                          onClick={handleVerifyCurrentPassword}
                        >
                          확인
                        </button>
                      </div>
                    )}
                  </label>
                )}
                {isPasswordEditing && (
                  <>
                    <label className="mypage-password-inner-field mypage-new-password-field">
                      <span className="field-heading">
                        새 비밀번호
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
                    <label className="mypage-password-inner-field mypage-new-password-field">
                      <span className="field-heading">
                        새 비밀번호 확인
                        {errors.confirmPassword && (
                          <strong className="field-error">{errors.confirmPassword}</strong>
                        )}
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
                  </>
                )}
                {!isPasswordCheckOpen && (
                  <button
                    className="mypage-password-field-button"
                    type="button"
                    disabled={isSubmitting || !isEditing}
                    onClick={() => {
                      if (!isEditing) return;
                      setIsPasswordCheckOpen(true);
                      setIsPasswordEditing(false);
                      setValues((current) => ({
                        ...current,
                        currentPassword: "",
                        password: "",
                        confirmPassword: "",
                      }));
                      setErrors((current) => ({
                        ...current,
                        currentPassword: "",
                        password: "",
                        confirmPassword: "",
                      }));
                    }}
                  >
                    비밀번호 변경
                  </button>
                )}
              </div>
            </div>
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
                readOnly={!isEditing}
                disabled={isSubmitting}
                onChange={(event) => updateField("nickname", event.target.value)}
                aria-invalid={Boolean(errors.nickname)}
              />
            </label>
            <fieldset className="mypage-radio-field" aria-invalid={Boolean(errors.modelGender)}>
              <span className="field-heading">
                AI 모델 성별
                {errors.modelGender && <strong className="field-error">{errors.modelGender}</strong>}
              </span>
              <div className="mypage-radio-options">
                <label className="mypage-radio-option">
                  <input
                    type="radio"
                    name="modelGender"
                    value="male"
                    checked={values.modelGender === "male"}
                    disabled={isSubmitting || !isEditing}
                    onChange={(event) => updateField("modelGender", event.target.value)}
                  />
                  <span>남성</span>
                </label>
                <label className="mypage-radio-option">
                  <input
                    type="radio"
                    name="modelGender"
                    value="female"
                    checked={values.modelGender === "female"}
                    disabled={isSubmitting || !isEditing}
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
                readOnly={!isEditing}
                disabled={isSubmitting}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={Boolean(errors.email)}
              />
            </label>
            {errors.form && <p className="form-error">{errors.form}</p>}
            <button
              className="mypage-delete-button"
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsDeleteModalOpen(true)}
            >
              회원 탈퇴하기
            </button>
            <button className="submit-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? (isEditing ? "저장 중" : "수정 중") : isEditing ? "저장하기" : "수정하기"}
            </button>
          </form>
          {notice && <p className="mypage-notice">{notice}</p>}
        </section>
      </main>
      <Modal
        isOpen={isUpdateCompleteModalOpen}
        titleId="mypage-update-complete-title"
        onClose={refreshAfterProfileUpdate}
        onConfirm={refreshAfterProfileUpdate}
      >
        <h2 id="mypage-update-complete-title">수정 완료</h2>
        <p>회원정보 수정이 완료되었습니다.</p>
        <button className="modal-button" type="button" onClick={refreshAfterProfileUpdate}>
          확인
        </button>
      </Modal>
      <Modal
        isOpen={isNoChangeModalOpen}
        titleId="mypage-no-change-title"
        onClose={() => setIsNoChangeModalOpen(false)}
        onConfirm={() => setIsNoChangeModalOpen(false)}
      >
        <h2 id="mypage-no-change-title">변경 사항 없음</h2>
        <p>수정한 내용이 없습니다.</p>
        <button className="modal-button" type="button" onClick={() => setIsNoChangeModalOpen(false)}>
          확인
        </button>
      </Modal>
      <Modal
        isOpen={Boolean(updateFailMessage)}
        titleId="mypage-update-fail-title"
        onClose={() => setUpdateFailMessage("")}
        onConfirm={() => setUpdateFailMessage("")}
      >
        <h2 id="mypage-update-fail-title">수정 실패</h2>
        <p>{updateFailMessage}</p>
        <button className="modal-button" type="button" onClick={() => setUpdateFailMessage("")}>
          확인
        </button>
      </Modal>
      <Modal
        isOpen={isDeleteModalOpen}
        titleId="delete-account-title"
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
      >
        <h2 id="delete-account-title">회원 탈퇴</h2>
        <p>정말 탈퇴하시겠습니까?</p>
        <p>회원 탈퇴 시 옷, 코디, 게시글, 댓글, 업로드한 이미지가 모두 삭제됩니다.</p>
        <div className="mypage-delete-modal-actions">
          <button
            className="mypage-delete-cancel-button"
            type="button"
            onClick={() => setIsDeleteModalOpen(false)}
          >
            취소
          </button>
          <button className="mypage-delete-confirm-button" type="button" onClick={handleDeleteConfirm}>
            탈퇴하기
          </button>
        </div>
      </Modal>
      <Modal
        isOpen={deleteResult.isOpen}
        titleId="delete-result-title"
        onClose={handleDeleteResultConfirm}
        onConfirm={handleDeleteResultConfirm}
      >
        <h2 id="delete-result-title">{deleteResult.isSuccess ? "탈퇴 완료" : "탈퇴 실패"}</h2>
        <p>
          {deleteResult.isSuccess
            ? "회원 탈퇴가 완료되었습니다."
            : `회원 탈퇴에 실패했습니다. ${deleteResult.message}`}
        </p>
        <button className="modal-button" type="button" onClick={handleDeleteResultConfirm}>
          확인
        </button>
      </Modal>
    </>
  );
}

export default MyPage;
