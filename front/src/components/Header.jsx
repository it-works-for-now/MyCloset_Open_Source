import React from "react";
import Logo from "./Logo.jsx";
import mypageButtonImage from "../../img/mypage-button.png";

function Header({ page, path, user, navItems, onHome, onLogin, onLogout, onNavigate }) {
  const isAuthPage = page === "login" || page === "signup";
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  React.useEffect(() => {
    setIsDrawerOpen(false);
  }, [path, isAuthPage]);

  React.useEffect(() => {
    if (!isDrawerOpen) {
      return undefined;
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setIsDrawerOpen(false);
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawerOpen]);

  function handleNavigate(nextPath) {
    setIsDrawerOpen(false);
    onNavigate(nextPath);
  }

  function handleAuthAction() {
    if (user) {
      onLogout();
      return;
    }

    handleNavigate(path === "/login" ? "/signup" : "/login");
  }

  function renderNavLinks(className, items = navItems) {
    return (
      <nav className={className} aria-label="주요 메뉴">
        {items.map((item) => (
          <a
            href={item.path}
            key={item.path}
            aria-current={path === item.path ? "page" : undefined}
            onClick={(event) => {
              event.preventDefault();
              handleNavigate(item.path);
            }}
          >
            {item.label}
          </a>
        ))}
      </nav>
    );
  }

  const drawerItems = user
    ? [
        ...navItems,
        ...(user.role === "ADMIN" ? [{ label: "관리자", path: "/admin" }] : []),
        { label: "마이페이지", path: "/mypage" },
      ]
    : navItems;

  const authButtonLabel = user
    ? "로그아웃"
    : path === "/login"
      ? "회원가입"
      : path === "/signup"
        ? "로그인"
        : "로그인/회원가입";

  return (
    <>
      <header className="topbar">
        <Logo onClick={onHome} />
        {renderNavLinks("nav")}
        <button
          className="menu-button"
          type="button"
          aria-label="메뉴 열기"
          aria-expanded={isDrawerOpen}
          aria-controls="mobile-menu-drawer"
          onClick={() => setIsDrawerOpen(true)}
        >
          <span aria-hidden="true" />
          <span aria-hidden="true" />
          <span aria-hidden="true" />
        </button>
        <div className="header-actions">
          {user?.role === "ADMIN" && (
            <button className="admin-header-link" type="button" onClick={() => handleNavigate("/admin")}>
              관리자
            </button>
          )}
          {user && (
            <button
              className="profile-link"
              type="button"
              title={user.email}
              onClick={() => handleNavigate("/mypage")}
            >
              <img src={mypageButtonImage} alt="" aria-hidden="true" />
              <span className="user-chip">{user.nickname}님</span>
            </button>
          )}
          <button className="login-button" type="button" onClick={handleAuthAction}>
            {authButtonLabel}
          </button>
        </div>
      </header>
      <div
        className={`drawer-backdrop ${isDrawerOpen ? "is-open" : ""}`}
        role="presentation"
        onClick={() => setIsDrawerOpen(false)}
      >
        <aside
          className="side-drawer"
          id="mobile-menu-drawer"
          aria-hidden={!isDrawerOpen}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="drawer-head">
            <strong>메뉴</strong>
            <button
              className="drawer-close"
              type="button"
              aria-label="메뉴 닫기"
              onClick={() => setIsDrawerOpen(false)}
            >
              ×
            </button>
          </div>
          {renderNavLinks("drawer-nav", drawerItems)}
        </aside>
      </div>
    </>
  );
}

export default Header;
