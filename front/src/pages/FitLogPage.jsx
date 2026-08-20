import React from "react";
import "./FitLogPage.css";
import Modal from "../components/Modal.jsx";
import noLoginImage from "../../img/fit-log-no-login.png";
import noRoomImage from "../../img/fit-log-no-room.png";
import fitMeterOffImage from "../../img/fit-meter-off.png";
import fitMeterOnImage from "../../img/fit-meter-on.png";
import {
  createFitRoom,
  createFitRoomInviteUrl,
  fetchFitRooms,
  joinFitRoom,
  prepareFitRoomJoinByCode,
} from "../utils/fitLog.js";

const roomMemberOptions = [1, 2, 3, 4, 5, 6, 7, 8];

function addFitRoom(rooms, room) {
  return [room, ...rooms.filter((item) => item.id !== room.id)];
}

function FitRoomCard({ room, onEnterRoom }) {
  const fitMeterImage = room.isFitComplete ? fitMeterOnImage : fitMeterOffImage;
  const recentChat = [room.recentMessageAuthor, room.status].filter(Boolean).join(": ");
  const fitMeterAlt = room.isFitComplete
    ? "방의 모든 인원이 오늘의 핏을 올렸습니다."
    : "아직 오늘의 핏을 올리지 않은 인원이 있습니다.";

  return (
    <button className="fit-room-card" type="button" onClick={() => onEnterRoom(room)}>
      <span className="fit-room-info">
        <strong>{room.name}</strong>
        <span title={recentChat}>{recentChat}</span>
      </span>
      <img className="fit-room-icon" src={fitMeterImage} alt={fitMeterAlt} />
    </button>
  );
}

function FitLogPage({ user, onEnterRoom, notice, onNoticeDismiss }) {
  const isLoggedIn = Boolean(user);
  const [fitRooms, setFitRooms] = React.useState([]);
  const hasRooms = fitRooms.length > 0;
  const emptyRoomImage = isLoggedIn ? noRoomImage : noLoginImage;
  const emptyRoomMessage = isLoggedIn ? "참여한 방이 없습니다." : "로그인 후 이용해 주세요.";
  const [isCodeModalOpen, setIsCodeModalOpen] = React.useState(false);
  const [isJoinConfirmOpen, setIsJoinConfirmOpen] = React.useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [isCreateCompleteOpen, setIsCreateCompleteOpen] = React.useState(false);
  const [selectedRoom, setSelectedRoom] = React.useState(null);
  const [roomCode, setRoomCode] = React.useState("");
  const [newRoomName, setNewRoomName] = React.useState("");
  const [newRoomNameError, setNewRoomNameError] = React.useState("");
  const [newRoomLimit, setNewRoomLimit] = React.useState(4);
  const [createdRoom, setCreatedRoom] = React.useState(null);
  const [inviteShareMessage, setInviteShareMessage] = React.useState("");

  React.useEffect(() => {
    let active = true;

    fetchFitRooms(user).then((rooms) => {
      if (active) {
        setFitRooms(rooms);
      }
    });

    return () => {
      active = false;
    };
  }, [user]);

  async function openJoinConfirmByCode(code) {
    const roomToJoin = await prepareFitRoomJoinByCode(code);

    if (!roomToJoin) {
      return;
    }

    setIsCodeModalOpen(false);
    setSelectedRoom(roomToJoin);
    setIsJoinConfirmOpen(true);
  }

  function handleJoinByCode(event) {
    event.preventDefault();

    if (!roomCode.trim()) {
      return;
    }

    openJoinConfirmByCode(roomCode);
  }

  function handleCloseCodeModal() {
    setIsCodeModalOpen(false);
    setRoomCode("");
  }

  function handleCloseJoinConfirm() {
    setIsJoinConfirmOpen(false);
    setSelectedRoom(null);
  }

  async function handleConfirmJoinRoom() {
    if (!selectedRoom) {
      return;
    }

    const joinedRoom = await joinFitRoom(user, selectedRoom);

    if (!joinedRoom) {
      return;
    }

    setIsJoinConfirmOpen(false);
    setRoomCode("");
    setFitRooms((rooms) => addFitRoom(rooms, joinedRoom));
    setSelectedRoom(null);
  }

  function handleCloseCreateModal() {
    setIsCreateModalOpen(false);
    setNewRoomName("");
    setNewRoomNameError("");
    setNewRoomLimit(4);
  }

  async function createRoomFromInput(trimmedRoomName) {
    if (!trimmedRoomName) {
      setNewRoomNameError("방 이름을 입력해 주세요.");
      return;
    }

    setNewRoomNameError("");
    const nextRoom = await createFitRoom(user, {
      name: trimmedRoomName,
      memberLimit: newRoomLimit,
    });

    if (!nextRoom) {
      return;
    }
    setCreatedRoom(nextRoom);
    setFitRooms((rooms) => addFitRoom(rooms, nextRoom));
    setIsCreateModalOpen(false);
    setIsCreateCompleteOpen(true);
  }

  function handleCreateRoom(event) {
    event.preventDefault();
    createRoomFromInput(newRoomName.trim());
  }

  function handleCloseCreateComplete() {
    setIsCreateCompleteOpen(false);
    setCreatedRoom(null);
    setInviteShareMessage("");
    setNewRoomName("");
    setNewRoomLimit(4);
  }

  function handleConfirmCreateComplete() {
    handleCloseCreateComplete();
  }

  async function handleShareInvite() {
    if (!createdRoom) {
      return;
    }

    const inviteUrl = createFitRoomInviteUrl(createdRoom);
    const shareData = {
      title: `${createdRoom.name} 초대`,
      text: "핏로그 방에 초대합니다.",
      url: inviteUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setInviteShareMessage("공유가 완료되었습니다.");
        return;
      }

      await navigator.clipboard.writeText(inviteUrl);
      setInviteShareMessage("초대 링크 복사가 완료되었습니다.");
    } catch (error) {
      setInviteShareMessage("초대 링크 공유를 완료하지 못했습니다.");
    }
  }

  return (
    <main className="fit-log-main">
      <section className="fit-log-panel" aria-labelledby="fit-log-title">
        <h1 id="fit-log-title">핏로그</h1>

        {notice && (
          <div className="fit-log-notice" role="alert">
            <p>{notice}</p>
            <button type="button" aria-label="알림 닫기" onClick={onNoticeDismiss}>
              닫기
            </button>
          </div>
        )}

        <div className="fit-log-actions">
          <button className="fit-code-button" type="button" onClick={() => setIsCodeModalOpen(true)}>
            코드로 입장하기
          </button>
          <button className="fit-create-button" type="button" onClick={() => setIsCreateModalOpen(true)}>
            + 방 만들기
          </button>
        </div>

        <section className="fit-room-list" aria-label="참여한 방 목록">
          {hasRooms ? (
            fitRooms.map((room) => <FitRoomCard room={room} onEnterRoom={onEnterRoom} key={room.id} />)
          ) : (
            <div className="fit-no-room">
              <img src={emptyRoomImage} alt={emptyRoomMessage} />
            </div>
          )}
        </section>
      </section>

      <Modal
        isOpen={isCodeModalOpen}
        titleId="fit-code-modal-title"
        className="fit-code-modal"
        onClose={handleCloseCodeModal}
        onConfirm={() => {
          if (roomCode.trim()) {
            openJoinConfirmByCode(roomCode);
          }
        }}
      >
        <h2 id="fit-code-modal-title">방 코드 입력</h2>
        <form className="fit-code-form" onSubmit={handleJoinByCode}>
          <label className="fit-code-input">
            <span aria-hidden="true">#</span>
            <input
              type="text"
              value={roomCode}
              placeholder="abcd1234"
              data-autofocus
              onChange={(event) => setRoomCode(event.target.value)}
            />
          </label>
          <div className="fit-code-modal-actions">
            <button className="fit-code-cancel" type="button" onClick={handleCloseCodeModal}>
              취소
            </button>
            <button className="fit-code-submit" type="submit">
              참여하기
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isJoinConfirmOpen}
        titleId="fit-join-confirm-title"
        className="fit-join-confirm-modal"
        onClose={handleCloseJoinConfirm}
        onConfirm={handleConfirmJoinRoom}
      >
        <h2 id="fit-join-confirm-title">방 입장 확인</h2>
        <p>
          <strong>{selectedRoom?.name}</strong> 방에 입장하시겠습니까?
        </p>
        <div className="fit-code-modal-actions">
          <button className="fit-code-cancel" type="button" onClick={handleCloseJoinConfirm}>
            취소
          </button>
          <button className="fit-code-submit" type="button" onClick={handleConfirmJoinRoom}>
            확인
          </button>
        </div>
      </Modal>
      <Modal
        isOpen={isCreateModalOpen}
        titleId="fit-create-modal-title"
        className="fit-create-modal"
        onClose={handleCloseCreateModal}
        onConfirm={() => {
          createRoomFromInput(newRoomName.trim());
        }}
      >
        <h2 id="fit-create-modal-title">방 만들기</h2>
        <form className="fit-create-form" onSubmit={handleCreateRoom}>
          <label className="fit-create-name">
            <span>방 이름</span>
            {newRoomNameError && <em className="fit-create-name-error">{newRoomNameError}</em>}
            <input
              type="text"
              value={newRoomName}
              placeholder="방 이름을 입력하세요"
              data-autofocus
              onChange={(event) => {
                setNewRoomName(event.target.value);
                if (newRoomNameError) {
                  setNewRoomNameError("");
                }
              }}
            />
          </label>

          <fieldset className="fit-member-options">
            <legend>방 인원수</legend>
            <div className="fit-member-option-list">
              {roomMemberOptions.map((count) => (
                <button
                  className={newRoomLimit === count ? "is-selected" : ""}
                  type="button"
                  aria-pressed={newRoomLimit === count}
                  key={count}
                  onClick={() => setNewRoomLimit(count)}
                >
                  {count}
                </button>
              ))}
            </div>
          </fieldset>

          <div className="fit-code-modal-actions">
            <button className="fit-code-cancel" type="button" onClick={handleCloseCreateModal}>
              취소
            </button>
            <button className="fit-code-submit" type="submit">
              만들기
            </button>
          </div>
        </form>
      </Modal>
      <Modal
        isOpen={isCreateCompleteOpen}
        titleId="fit-create-complete-title"
        className="fit-create-complete-modal"
        onClose={handleCloseCreateComplete}
        onConfirm={handleConfirmCreateComplete}
      >
        <h2 id="fit-create-complete-title">방 생성 완료</h2>
        <dl className="fit-created-room-info">
          <div>
            <dt>방 이름</dt>
            <dd>{createdRoom?.name}</dd>
          </div>
          <div>
            <dt>방 코드</dt>
            <dd>#{createdRoom?.code}</dd>
          </div>
          <div>
            <dd>
              <button className="fit-invite-share-button" type="button" onClick={handleShareInvite}>
                친구 초대하기
              </button>
            </dd>
          </div>
        </dl>
        <button
          className="fit-code-submit fit-complete-confirm"
          type="button"
          onClick={handleConfirmCreateComplete}
        >
          확인
        </button>
      </Modal>
      <Modal
        isOpen={Boolean(inviteShareMessage)}
        titleId="fit-invite-result-title"
        className="fit-invite-result-modal"
        onClose={() => setInviteShareMessage("")}
        onConfirm={() => setInviteShareMessage("")}
      >
        <h2 id="fit-invite-result-title">알림</h2>
        <p>{inviteShareMessage}</p>
        <button
          className="fit-code-submit fit-invite-result-confirm"
          type="button"
          onClick={() => setInviteShareMessage("")}
        >
          확인
        </button>
      </Modal>
    </main>
  );
}

export default FitLogPage;
