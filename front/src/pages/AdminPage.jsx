import React from "react";
import Modal from "../components/Modal.jsx";
import { deleteAdminUser, fetchAdminUser, fetchAdminUsers, updateAdminUserRole } from "../utils/admin.js";
import "./AdminPage.css";

function formatDate(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function getUserId(user) {
  return user?.id || user?.loginId || "";
}

function AdminPage({ user, onHome, onUserUpdated }) {
  const [users, setUsers] = React.useState([]);
  const [query, setQuery] = React.useState("");
  const [status, setStatus] = React.useState("loading");
  const [error, setError] = React.useState("");
  const [selectedUser, setSelectedUser] = React.useState(null);
  const [detailStatus, setDetailStatus] = React.useState("idle");
  const [notice, setNotice] = React.useState("");
  const [roleTarget, setRoleTarget] = React.useState(null);
  const [roleResult, setRoleResult] = React.useState(null);
  const [deleteTarget, setDeleteTarget] = React.useState(null);
  const [deleteResult, setDeleteResult] = React.useState(null);
  const [actionError, setActionError] = React.useState("");
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const currentUserId = getUserId(user);
  const deleteTargetName = deleteTarget?.loginId || deleteTarget?.id || "회원";

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadUsers() {
      setStatus("loading");
      setError("");

      try {
        const nextUsers = await fetchAdminUsers({ signal: controller.signal });
        setUsers(nextUsers);
        setStatus("ready");
      } catch (loadError) {
        if (loadError.name === "AbortError") return;
        setError(loadError.message || "회원 목록을 불러오지 못했습니다.");
        setStatus("error");
      }
    }

    loadUsers();
    return () => controller.abort();
  }, []);

  const filteredUsers = React.useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((item) =>
      [item.email, item.loginId, item.id, item.nickname].some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(keyword)
      )
    );
  }, [query, users]);

  const adminCount = users.filter((item) => item.role === "ADMIN").length;

  async function handleSearchSubmit(event) {
    event.preventDefault();
    setStatus("loading");
    setError("");

    try {
      const nextUsers = await fetchAdminUsers({ query });
      setUsers(nextUsers);
      setStatus("ready");
    } catch (searchError) {
      setError(searchError.message || "회원을 검색하지 못했습니다.");
      setStatus("error");
    }
  }

  async function openUserDetail(targetUser) {
    setSelectedUser(targetUser);
    setDetailStatus("loading");
    setNotice("");

    try {
      const detail = await fetchAdminUser(targetUser.id);
      setSelectedUser(detail);
      setDetailStatus("ready");
    } catch (detailError) {
      setDetailStatus("error");
      setError(detailError.message || "회원 상세 정보를 불러오지 못했습니다.");
    }
  }

  function closeUserDetail() {
    setSelectedUser(null);
    setDetailStatus("idle");
  }

  function askRoleChange(targetUser) {
    setRoleTarget(targetUser);
    setNotice("");
    setActionError("");
  }

  function askDelete(targetUser) {
    setDeleteTarget(targetUser);
    setNotice("");
    setActionError("");
  }

  async function confirmRoleChange() {
    if (!roleTarget || isSubmitting) return;

    const nextRole = roleTarget.role === "ADMIN" ? "USER" : "ADMIN";
    setIsSubmitting(true);

    try {
      const result = await updateAdminUserRole(roleTarget.id, nextRole);
      const updatedUser = result.user || result;

      setUsers((current) =>
        current.map((item) => (String(item.id) === String(updatedUser.id) ? updatedUser : item))
      );
      setSelectedUser((current) =>
        current && String(current.id) === String(updatedUser.id) ? updatedUser : current
      );
      if (result.currentUser) {
        onUserUpdated(result.currentUser);
      }
      setRoleResult({
        loginId: updatedUser.loginId || updatedUser.id,
        role: nextRole,
      });
      setRoleTarget(null);
    } catch (roleError) {
      setRoleTarget(null);
      setActionError(roleError.message || "회원 권한을 변경하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function confirmDeleteUser() {
    if (!deleteTarget || isSubmitting) return;

    setIsSubmitting(true);

    try {
      await deleteAdminUser(deleteTarget.id);
      setUsers((current) => current.filter((item) => String(item.id) !== String(deleteTarget.id)));
      setSelectedUser((current) =>
        current && String(current.id) === String(deleteTarget.id) ? null : current
      );
      setDeleteResult({
        loginId: deleteTarget.loginId || deleteTarget.id,
      });
      setDeleteTarget(null);
    } catch (deleteError) {
      setDeleteTarget(null);
      setActionError(deleteError.message || "회원을 삭제하지 못했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function canChangeRole(targetUser) {
    if (!targetUser) return false;
    if (String(targetUser.id) === String(currentUserId)) return false;
    if (targetUser.role === "ADMIN" && adminCount <= 1) return false;
    return true;
  }

  function canDelete(targetUser) {
    return targetUser && String(targetUser.id) !== String(currentUserId);
  }

  return (
    <>
      <main className="admin-main">
        <aside className="admin-sidebar" aria-label="관리자 메뉴">
          <div className="admin-brand">
            <span>MyCloset</span>
            <strong>Admin</strong>
          </div>
          <nav className="admin-menu" aria-label="관리자 기능">
            <button className="is-active" type="button">
              회원 관리
            </button>
          </nav>
          <button className="admin-home-button" type="button" onClick={onHome}>
            메인으로
          </button>
        </aside>

        <section className="admin-content" aria-labelledby="admin-title">
          <header className="admin-content-head">
            <div>
              <p className="admin-eyebrow">관리자 페이지</p>
              <h1 id="admin-title">회원 관리</h1>
            </div>
            <div className="admin-user-summary">
              <span>{user?.nickname || user?.id}</span>
              <strong>{user?.role}</strong>
            </div>
          </header>

          <section className="admin-stats" aria-label="회원 요약">
            <article>
              <span>전체 회원</span>
              <strong>{users.length}</strong>
            </article>
            <article>
              <span>관리자</span>
              <strong>{adminCount}</strong>
            </article>
            <article>
              <span>검색 결과</span>
              <strong>{filteredUsers.length}</strong>
            </article>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <h2>회원 목록</h2>
              <form className="admin-search" onSubmit={handleSearchSubmit}>
                <label>
                  <span className="visually-hidden">회원 검색</span>
                  <input
                    type="search"
                    value={query}
                    placeholder="이메일, 로그인 ID, 닉네임 검색"
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <button type="submit">검색</button>
              </form>
            </div>

            {notice && (
              <p className="admin-notice" role="status">
                {notice}
              </p>
            )}
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            {status === "loading" && <p className="admin-message">회원 목록을 불러오는 중입니다.</p>}
            {status === "ready" && filteredUsers.length === 0 && (
              <p className="admin-message">조건에 맞는 회원이 없습니다.</p>
            )}

            {status === "ready" && filteredUsers.length > 0 && (
              <div className="admin-table-wrap">
                <table className="admin-user-table">
                  <thead>
                    <tr>
                      <th>로그인 ID</th>
                      <th>이메일</th>
                      <th>닉네임</th>
                      <th>권한</th>
                      <th>가입일</th>
                      <th>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((item) => (
                      <tr key={item.id}>
                        <td>{item.loginId || item.id}</td>
                        <td>{item.email || "-"}</td>
                        <td>{item.nickname || "-"}</td>
                        <td>
                          <span className={`admin-role-badge ${item.role === "ADMIN" ? "is-admin" : ""}`}>
                            {item.role}
                          </span>
                        </td>
                        <td>{formatDate(item.createdAt)}</td>
                        <td>
                          <div className="admin-row-actions">
                            <button type="button" onClick={() => openUserDetail(item)}>
                              상세
                            </button>
                            <button
                              type="button"
                              disabled={!canChangeRole(item)}
                              onClick={() => askRoleChange(item)}
                            >
                              권한 변경
                            </button>
                            <button
                              className="is-danger"
                              type="button"
                              disabled={!canDelete(item)}
                              onClick={() => askDelete(item)}
                            >
                              강제 탈퇴
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </section>
      </main>

      <Modal
        isOpen={Boolean(selectedUser)}
        titleId="admin-user-detail-title"
        className="admin-detail-modal"
        onClose={closeUserDetail}
        onConfirm={closeUserDetail}
      >
        {selectedUser && (
          <>
            <h2 id="admin-user-detail-title">회원 상세</h2>
            {detailStatus === "loading" && <p className="admin-message">상세 정보를 불러오는 중입니다.</p>}
            {detailStatus !== "loading" && (
              <dl className="admin-detail-list">
                <div>
                  <dt>로그인 ID</dt>
                  <dd>{selectedUser.loginId || selectedUser.id}</dd>
                </div>
                <div>
                  <dt>이메일</dt>
                  <dd>{selectedUser.email || "-"}</dd>
                </div>
                <div>
                  <dt>닉네임</dt>
                  <dd>{selectedUser.nickname || "-"}</dd>
                </div>
                <div>
                  <dt>권한</dt>
                  <dd>{selectedUser.role}</dd>
                </div>
                <div>
                  <dt>가입일</dt>
                  <dd>{formatDate(selectedUser.createdAt)}</dd>
                </div>
                <div>
                  <dt>수정일</dt>
                  <dd>{formatDate(selectedUser.updatedAt)}</dd>
                </div>
              </dl>
            )}
            <div className="admin-modal-actions">
              <button className="admin-secondary-button" type="button" onClick={closeUserDetail}>
                닫기
              </button>
            </div>
          </>
        )}
      </Modal>

      <Modal
        isOpen={Boolean(roleTarget)}
        titleId="admin-role-title"
        className="admin-confirm-modal"
        onClose={() => setRoleTarget(null)}
        onConfirm={confirmRoleChange}
      >
        <h2 id="admin-role-title">권한을 변경할까요?</h2>
        <p>
          {roleTarget?.nickname || roleTarget?.loginId}님의 권한을{" "}
          <strong>{roleTarget?.role === "ADMIN" ? "USER" : "ADMIN"}</strong>로 변경합니다.
        </p>
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={() => setRoleTarget(null)}>
            취소
          </button>
          <button
            className="admin-primary-button"
            type="button"
            disabled={isSubmitting}
            onClick={confirmRoleChange}
          >
            변경하기
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(roleResult)}
        titleId="admin-role-result-title"
        className="admin-confirm-modal"
        onClose={() => setRoleResult(null)}
        onConfirm={() => setRoleResult(null)}
      >
        <h2 id="admin-role-result-title">권한 변경 완료</h2>
        <p>
          {roleResult?.loginId}의 권한이 <strong>{roleResult?.role}</strong>으로 변경되었습니다.
        </p>
        <div className="admin-modal-actions">
          <button className="admin-primary-button" type="button" onClick={() => setRoleResult(null)}>
            확인
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteTarget)}
        titleId="admin-delete-title"
        className="admin-confirm-modal"
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDeleteUser}
      >
        <h2 id="admin-delete-title">회원을 강제 탈퇴할까요?</h2>
        <p>강제 탈퇴 처리한 회원은 다시 복구할 수 없습니다.</p>
        <p>
          강제 탈퇴 처리 시 {deleteTargetName}의 옷, 코디, 게시글, 댓글, 업로드한 이미지가 모두 삭제됩니다.
        </p>
        <div className="admin-modal-actions">
          <button className="admin-secondary-button" type="button" onClick={() => setDeleteTarget(null)}>
            취소
          </button>
          <button
            className="admin-danger-button"
            type="button"
            disabled={isSubmitting}
            onClick={confirmDeleteUser}
          >
            강제 탈퇴
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(deleteResult)}
        titleId="admin-delete-result-title"
        className="admin-confirm-modal"
        onClose={() => setDeleteResult(null)}
        onConfirm={() => setDeleteResult(null)}
      >
        <h2 id="admin-delete-result-title">강제 탈퇴 완료</h2>
        <p>{deleteResult?.loginId}의 계정이 강제 탈퇴 처리되었습니다.</p>
        <div className="admin-modal-actions">
          <button className="admin-primary-button" type="button" onClick={() => setDeleteResult(null)}>
            확인
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(actionError)}
        titleId="admin-action-error-title"
        className="admin-confirm-modal"
        onClose={() => setActionError("")}
        onConfirm={() => setActionError("")}
      >
        <h2 id="admin-action-error-title">처리하지 못했습니다</h2>
        <p>{actionError}</p>
        <div className="admin-modal-actions">
          <button className="admin-primary-button" type="button" onClick={() => setActionError("")}>
            확인
          </button>
        </div>
      </Modal>
    </>
  );
}

export default AdminPage;
