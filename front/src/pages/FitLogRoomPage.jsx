import React from "react";
import "./FitLogRoomPage.css";
import Modal from "../components/Modal.jsx";
import backWhiteButtonImage from "../../img/back-white-button.png";
import chatButtonImage from "../../img/chat-button.png";
import detailButtonImage from "../../img/detail-button.png";
import fitLogEmojiImage from "../../img/fit-log-emoji.png";
import fitLogReplyImage from "../../img/fit-log-reply.png";
import fitMeterOffImage from "../../img/fit-meter-off.png";
import defaultProfileImage from "../../img/default-profile.jpg";
import {
  addFitLogReaction,
  createFitRoomInviteUrl,
  deleteFitRoom,
  deleteMyFitLog,
  fetchFitRoomState,
  kickFitRoomMember,
  leaveFitRoom,
  saveMyFitLog,
  saveFitRoomStateSnapshot,
  sendFitRoomMessage,
  updateFitLogCaption,
  updateFitRoom,
  updateFitRoomProfileImage,
  uploadFitLogImage,
  uploadFitRoomProfileImage,
} from "../utils/fitLog.js";

const fallbackRoom = {
  id: "test-room-1",
  name: "Test Room 1",
  memberLimit: 2,
};
async function copyText(value) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();

  const copied = document.execCommand("copy");
  textarea.remove();

  if (!copied) {
    throw new Error("텍스트를 복사하지 못했습니다.");
  }
}

const emojiCategories = [
  {
    id: "faces",
    label: "이모티콘 및 감정",
    icon: "☺",
    emojis: [
      "😀",
      "😁",
      "😂",
      "🤣",
      "😃",
      "😄",
      "😅",
      "😆",
      "😉",
      "😊",
      "😋",
      "😎",
      "😍",
      "😘",
      "🥰",
      "😙",
      "🤗",
      "🤩",
      "🤔",
      "😌",
      "😐",
      "😑",
      "😮",
      "😴",
      "😝",
      "😵",
      "☹️",
      "😢",
      "🥵",
      "🥶",
      "🤪",
      "😵",
    ],
  },
  {
    id: "people",
    label: "사람",
    icon: "🧍",
    emojis: [
      "👋",
      "👏",
      "🙌",
      "👍",
      "👎",
      "👌",
      "✌️",
      "🙏",
      "💪",
      "👐",
      "🤝",
      "🙆",
      "🙅",
      "💁",
      "🙋",
      "👤",
      "👩",
      "👨",
      "👦",
      "👯",
    ],
  },
  {
    id: "nature",
    label: "동물 및 자연",
    icon: "🌿",
    emojis: [
      "🐶",
      "🐱",
      "🐰",
      "🐻",
      "🐼",
      "🐨",
      "🦊",
      "🐸",
      "🐥",
      "🦋",
      "🌸",
      "🌷",
      "🌻",
      "🌿",
      "🍀",
      "🌵",
      "🌙",
      "⭐",
      "☀️",
      "🌈",
    ],
  },
  {
    id: "food",
    label: "식음료",
    icon: "🍽",
    emojis: [
      "🍎",
      "🍊",
      "🍋",
      "🍓",
      "🍇",
      "🍉",
      "🍞",
      "🥐",
      "🥨",
      "🧀",
      "🍔",
      "🍟",
      "🍕",
      "🌮",
      "🍜",
      "🍣",
      "🍰",
      "🍪",
      "☕",
      "🥤",
    ],
  },
  {
    id: "travel",
    label: "여행 및 장소",
    icon: "✈",
    emojis: [
      "🚗",
      "🚌",
      "🚆",
      "✈️",
      "🚢",
      "🚲",
      "🏠",
      "🏫",
      "🏙",
      "🌉",
      "⛰",
      "🏖",
      "🏝",
      "🏕",
      "🗼",
      "🗽",
      "🎡",
      "🗺",
      "🧳",
      "📍",
    ],
  },
  {
    id: "activities",
    label: "활동 및 이벤트",
    icon: "🏆",
    emojis: [
      "⚽",
      "🏀",
      "🏈",
      "⚾",
      "🎾",
      "🏐",
      "🎱",
      "🏓",
      "🏸",
      "🏃",
      "💃",
      "🎤",
      "🎧",
      "🎮",
      "🎲",
      "🎯",
      "🎁",
      "🎉",
      "🎊",
      "🏆",
    ],
  },
  {
    id: "objects",
    label: "사물",
    icon: "💡",
    emojis: [
      "⌚",
      "📱",
      "💻",
      "⌨️",
      "📷",
      "🎥",
      "💡",
      "🔦",
      "📚",
      "✏️",
      "📌",
      "✂️",
      "🔒",
      "🔑",
      "🧸",
      "🛍",
      "👕",
      "👗",
      "👟",
      "💄",
    ],
  },
  {
    id: "symbols",
    label: "기호",
    icon: "符",
    emojis: [
      "❤️",
      "🧡",
      "💛",
      "💚",
      "💙",
      "💜",
      "🤍",
      "💔",
      "💕",
      "💯",
      "✅",
      "❌",
      "⭕",
      "❗",
      "❓",
      "✨",
      "🔥",
      "⭐",
      "🔔",
      "♻️",
    ],
  },
  {
    id: "flags",
    label: "깃발",
    icon: "⚑",
    emojis: [
      "🏳️",
      "🏴",
      "🏁",
      "🚩",
      "🇰🇷",
      "🇺🇸",
      "🇯🇵",
      "🇨🇳",
      "🇬🇧",
      "🇫🇷",
      "🇩🇪",
      "🇮🇹",
      "🇪🇸",
      "🇨🇦",
      "🇦🇺",
      "🇧🇷",
      "🇮🇳",
      "🇲🇽",
      "🇹🇭",
      "🇻🇳",
    ],
  },
];

const CHAT_POLLING_INTERVAL_MS = 3000;

function FitMemberCard({ member, reactionEmoji, onOpenReply, onOpenEmoji, onOpenUpload, onOpenFitMenu }) {
  const hasFit = Boolean(member.fitImage);

  return (
    <article className={`fit-member-card ${hasFit ? "has-fit" : "is-empty"}`}>
      <header className="fit-member-head">
        <img className="fit-member-avatar" src={member.avatar} alt="" aria-hidden="true" />
        <span>{member.name}</span>
        {hasFit && member.isCurrentUser && (
          <button
            className="fit-member-log-button"
            type="button"
            aria-label={`${member.name}님의 로그 메뉴 열기`}
            onClick={() => onOpenFitMenu(member)}
          >
            ⋯
          </button>
        )}
      </header>

      <div className="fit-member-photo">
        {hasFit ? (
          <img src={member.fitImage} alt={`${member.name}님의 오늘의 핏`} />
        ) : member.isCurrentUser ? null : (
          <img className="fit-empty-icon" src={fitMeterOffImage} alt="아직 오늘의 핏을 올리지 않았습니다." />
        )}
        {!hasFit && member.isCurrentUser && (
          <button className="fit-upload-look-button" type="button" onClick={onOpenUpload}>
            로그 작성
          </button>
        )}
        {hasFit && (
          <>
            {reactionEmoji && <span className="fit-photo-reaction">{reactionEmoji}</span>}
            <div className="fit-card-actions">
              <button
                type="button"
                aria-label={`${member.name}님의 코디에 답장하기`}
                onClick={() => onOpenReply(member)}
              >
                <img src={fitLogReplyImage} alt="" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label={`${member.name}님의 코디에 이모지 보내기`}
                onClick={() => onOpenEmoji(member)}
              >
                <img src={fitLogEmojiImage} alt="" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </div>

      {hasFit && (
        <footer className="fit-member-caption-row">{member.caption && <p>{member.caption}</p>}</footer>
      )}
    </article>
  );
}

function FitInviteSlotCard({ onInvite }) {
  return (
    <article className="fit-member-card fit-invite-slot-card" aria-label="비어있는 방 자리">
      <button className="fit-invite-slot-button" type="button" onClick={onInvite}>
        <span aria-hidden="true">+</span>
        <strong>친구 초대</strong>
      </button>
    </article>
  );
}

function FitLogRoomPage({ user, room, entryNotice, onEntryNoticeDismiss, onExitRoom }) {
  const activeRoom = room || fallbackRoom;
  const today = new Date();
  const todayLabel = `${today.getMonth() + 1}월${today.getDate()}일`;
  const memberLimit = Math.min(Math.max(Number(activeRoom.memberLimit) || 2, 1), 8);
  const currentUserName = user?.nickname || user?.name || "Test_user1";
  const roomCode = activeRoom.code || activeRoom.roomCode || activeRoom.id || "abcd1234";
  const isRoomHost = Boolean(activeRoom.isHost) || String(activeRoom.role || "").toLowerCase() === "host";
  const cameraInputRef = React.useRef(null);
  const imageInputRef = React.useRef(null);
  const profileInputRef = React.useRef(null);
  const fitPreviewObjectUrlRef = React.useRef(null);
  const profileObjectUrlRef = React.useRef(null);
  const hasLoadedRoomStateRef = React.useRef(false);
  const isChatPollingRef = React.useRef(false);
  const [chatMessagesElement, setChatMessagesElement] = React.useState(null);
  const [roomName, setRoomName] = React.useState(activeRoom.name);
  const [roomNameInput, setRoomNameInput] = React.useState(activeRoom.name);
  const [profileImage, setProfileImage] = React.useState(defaultProfileImage);
  const [roomMembers, setRoomMembers] = React.useState(activeRoom.members || []);
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false);
  const [roomNameError, setRoomNameError] = React.useState("");
  const [isUploadModalOpen, setIsUploadModalOpen] = React.useState(false);
  const [hostFitImage, setHostFitImage] = React.useState(null);
  const [hostFitCaption, setHostFitCaption] = React.useState("");
  const [uploadCaptionInput, setUploadCaptionInput] = React.useState("");
  const [selectedFitImageFile, setSelectedFitImageFile] = React.useState(null);
  const [selectedFitImagePreview, setSelectedFitImagePreview] = React.useState("");
  const [isSavingFitLog, setIsSavingFitLog] = React.useState(false);
  const [fitMenuTarget, setFitMenuTarget] = React.useState(null);
  const [captionEditTarget, setCaptionEditTarget] = React.useState(null);
  const [captionEditText, setCaptionEditText] = React.useState("");
  const [confirmAction, setConfirmAction] = React.useState(null);
  const [roomActionMessage, setRoomActionMessage] = React.useState("");
  const members = [
    {
      id: "host",
      name: currentUserName,
      avatar: profileImage,
      fitImage: hostFitImage,
      caption: hostFitCaption,
      isHost: isRoomHost,
      isCurrentUser: true,
    },
    ...roomMembers.map((member) => ({
      id: member.id,
      name: member.name,
      avatar: member.avatar || defaultProfileImage,
      fitImage: member.fitImage || null,
      caption: member.caption || "",
      isHost: Boolean(member.isHost),
      isCurrentUser: false,
    })),
  ];
  const inviteSlots = Array.from({ length: Math.max(memberLimit - members.length, 0) }, (_, index) => ({
    id: `invite-slot-${index + 1}`,
  }));
  const [replyTarget, setReplyTarget] = React.useState(null);
  const [replyText, setReplyText] = React.useState("");
  const [emojiTarget, setEmojiTarget] = React.useState(null);
  const [selectedEmojiCategoryId, setSelectedEmojiCategoryId] = React.useState(emojiCategories[0].id);
  const [fitReactions, setFitReactions] = React.useState({});
  const [fitReactionDetails, setFitReactionDetails] = React.useState({});
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatText, setChatText] = React.useState("");
  const [inviteShareMessage, setInviteShareMessage] = React.useState("");
  const [chatMessages, setChatMessages] = React.useState([
    { id: "chat-1", author: "Test_user2", text: "오늘 핏 올렸어!" },
  ]);
  const selectedEmojiCategory =
    emojiCategories.find((category) => category.id === selectedEmojiCategoryId) || emojiCategories[0];

  React.useLayoutEffect(() => {
    if (!isChatOpen || !chatMessagesElement) {
      return undefined;
    }

    const scrollToLatestMessage = () => {
      chatMessagesElement.scrollTop = chatMessagesElement.scrollHeight;
    };

    scrollToLatestMessage();
    const animationFrameId = window.requestAnimationFrame(scrollToLatestMessage);

    return () => window.cancelAnimationFrame(animationFrameId);
  }, [chatMessages, chatMessagesElement, isChatOpen]);

  function applyRoomState(state) {
    if (!state) {
      return;
    }

    setProfileImage(state.profileImageUrl || defaultProfileImage);
    setRoomMembers(state.members || []);
    setHostFitImage(state.myLog?.imageUrl || null);
    setHostFitCaption(state.myLog?.caption || "");
    setFitReactions(state.reactions || {});
    setFitReactionDetails(state.reactionDetails || {});
    setChatMessages(state.messages || []);
  }

  function showRoomActionError(error) {
    setRoomActionMessage(error?.message || "핏로그를 처리하지 못했습니다. 다시 시도해 주세요.");
  }

  React.useEffect(() => {
    return () => {
      if (fitPreviewObjectUrlRef.current) {
        URL.revokeObjectURL(fitPreviewObjectUrlRef.current);
      }
      if (profileObjectUrlRef.current) {
        URL.revokeObjectURL(profileObjectUrlRef.current);
      }
    };
  }, []);

  React.useEffect(() => {
    let active = true;

    hasLoadedRoomStateRef.current = false;
    setRoomName(activeRoom.name);
    setRoomNameInput(activeRoom.name);
    setRoomNameError("");
    fetchFitRoomState(user, activeRoom)
      .then((state) => {
        if (!active) return;

        applyRoomState(state);
        hasLoadedRoomStateRef.current = true;
      })
      .catch((error) => {
        if (active) {
          showRoomActionError(error);
        }
      });

    return () => {
      active = false;
    };
  }, [activeRoom, user]);

  React.useEffect(() => {
    if (!isChatOpen) {
      return undefined;
    }

    let active = true;

    const refreshChatMessages = async () => {
      if (document.hidden || isChatPollingRef.current) {
        return;
      }

      isChatPollingRef.current = true;

      try {
        const state = await fetchFitRoomState(user, activeRoom);
        if (active) {
          applyRoomState(state);
        }
      } catch {
        // Background polling should not interrupt an ongoing chat with an error message.
      } finally {
        isChatPollingRef.current = false;
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshChatMessages();
      }
    };

    refreshChatMessages();
    const intervalId = window.setInterval(refreshChatMessages, CHAT_POLLING_INTERVAL_MS);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [activeRoom, isChatOpen, user]);

  React.useEffect(() => {
    if (!hasLoadedRoomStateRef.current) {
      return;
    }

    saveFitRoomStateSnapshot(user, roomCode, {
      profileImageUrl: profileImage === defaultProfileImage ? "" : profileImage,
      members: roomMembers,
      myLog: {
        imageUrl: hostFitImage || "",
        caption: hostFitCaption,
      },
      reactions: fitReactions,
      reactionDetails: fitReactionDetails,
      messages: chatMessages,
    });
  }, [
    chatMessages,
    fitReactionDetails,
    fitReactions,
    hostFitCaption,
    hostFitImage,
    profileImage,
    roomCode,
    roomMembers,
    user,
  ]);

  function clearSelectedFitImage() {
    if (fitPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(fitPreviewObjectUrlRef.current);
      fitPreviewObjectUrlRef.current = null;
    }

    setSelectedFitImageFile(null);
    setSelectedFitImagePreview("");
  }

  function openUploadModal() {
    clearSelectedFitImage();
    setUploadCaptionInput("");
    setIsUploadModalOpen(true);
  }

  function closeUploadModal({ force = false } = {}) {
    if (isSavingFitLog && !force) {
      return;
    }

    clearSelectedFitImage();
    setUploadCaptionInput("");
    setIsUploadModalOpen(false);
  }

  function handleSelectFitImage(event) {
    const [file] = event.target.files || [];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setRoomActionMessage("이미지 파일을 선택해 주세요.");
      return;
    }

    clearSelectedFitImage();
    const previewUrl = URL.createObjectURL(file);
    fitPreviewObjectUrlRef.current = previewUrl;
    setSelectedFitImageFile(file);
    setSelectedFitImagePreview(previewUrl);
  }

  async function handleSaveFitLog() {
    if (!selectedFitImageFile || isSavingFitLog) {
      return;
    }

    setIsSavingFitLog(true);

    try {
      const nextImageUrl = await uploadFitLogImage(selectedFitImageFile);
      const state = await saveMyFitLog(user, roomCode, {
        imageUrl: nextImageUrl,
        caption: uploadCaptionInput.trim(),
      });
      applyRoomState(state);
      closeUploadModal({ force: true });
      setRoomActionMessage("오늘의 핏로그를 저장했습니다.");
    } catch (error) {
      showRoomActionError(error);
    } finally {
      setIsSavingFitLog(false);
    }
  }

  async function handleSelectProfileImage(event) {
    const [file] = event.target.files || [];

    if (!file) {
      return;
    }

    try {
      const nextImageUrl = await uploadFitRoomProfileImage(file);
      const state = await updateFitRoomProfileImage(user, roomCode, nextImageUrl);
      applyRoomState(state);
      setRoomActionMessage("내 프로필 사진을 변경했습니다.");
    } catch (error) {
      showRoomActionError(error);
    } finally {
      event.target.value = "";
    }
  }

  async function handleSaveRoomName(event) {
    event.preventDefault();

    const trimmedRoomName = roomNameInput.trim();

    if (!trimmedRoomName) {
      setRoomNameError("방 이름을 입력해 주세요.");
      return;
    }

    if (!isRoomHost) {
      setRoomNameError("방장만 방 이름을 수정할 수 있습니다.");
      return;
    }

    try {
      const updatedRoom = await updateFitRoom(user, roomCode, { name: trimmedRoomName });
      setRoomNameError("");
      setRoomName(updatedRoom?.name || trimmedRoomName);
      setRoomNameInput(updatedRoom?.name || trimmedRoomName);
      setRoomActionMessage("방 이름을 수정했습니다.");
    } catch (error) {
      setRoomNameError(error?.message || "방 이름을 수정하지 못했습니다.");
    }
  }

  function closeConfirmAction() {
    setConfirmAction(null);
  }

  async function handleConfirmRoomAction() {
    if (!confirmAction) {
      return;
    }

    try {
      if (confirmAction.type === "kick") {
        if (!isRoomHost) return;

        const state = await kickFitRoomMember(user, roomCode, confirmAction.member.id);
        applyRoomState(state);
        setRoomActionMessage(`${confirmAction.member.name}님을 내보냈습니다.`);
        closeConfirmAction();
        return;
      }

      if (confirmAction.type === "delete") {
        if (!isRoomHost) return;

        await deleteFitRoom(user, roomCode);
        closeConfirmAction();
        onExitRoom?.();
        return;
      }

      if (confirmAction.type === "leave") {
        if (isRoomHost) return;

        await leaveFitRoom(user, roomCode);
        closeConfirmAction();
        onExitRoom?.();
        return;
      }

      if (confirmAction.type === "deleteFit") {
        const state = await deleteMyFitLog(user, roomCode);
        applyRoomState(state);
        closeConfirmAction();
        setFitMenuTarget(null);
        setRoomActionMessage("올렸던 룩을 삭제했습니다.");
      }
    } catch (error) {
      showRoomActionError(error);
    }
  }

  function handleOpenCaptionEdit(member) {
    setFitMenuTarget(null);
    setCaptionEditTarget(member);
    setCaptionEditText(member.caption || "");
  }

  async function handleSaveCaptionEdit(event) {
    event.preventDefault();

    if (!captionEditTarget || !captionEditTarget.isCurrentUser) {
      return;
    }

    try {
      const state = await updateFitLogCaption(user, roomCode, captionEditTarget.id, captionEditText.trim());
      applyRoomState(state);
      setCaptionEditTarget(null);
      setCaptionEditText("");
    } catch (error) {
      showRoomActionError(error);
    }
  }

  async function handleShareInvite() {
    const inviteUrl = createFitRoomInviteUrl(activeRoom);
    const shareData = {
      title: `${activeRoom.name} 초대`,
      text: "핏로그 방에 초대합니다.",
      url: inviteUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        setInviteShareMessage("공유가 완료되었습니다.");
        return;
      }

      await copyText(inviteUrl);
      setInviteShareMessage("초대 링크 복사가 완료되었습니다.");
    } catch {
      setInviteShareMessage("초대 링크 공유를 완료하지 못했어요.");
    }
  }

  async function handleCopyRoomCode() {
    try {
      await copyText(roomCode);
      setInviteShareMessage("방 코드가 복사되었습니다.");
    } catch {
      setInviteShareMessage("방 코드를 복사하지 못했어요.");
    }
  }

  async function sendQuotedChatMessage(targetMember, text, type) {
    const state = await sendFitRoomMessage(user, roomCode, {
      text,
      type,
      quotedMemberId: String(targetMember.id),
    });
    applyRoomState(state);
    setIsChatOpen(true);
  }

  async function submitReply() {
    const trimmedReply = replyText.trim();

    if (!replyTarget || !trimmedReply) {
      return;
    }

    try {
      await sendQuotedChatMessage(replyTarget, trimmedReply, "REPLY");
      setReplyTarget(null);
      setReplyText("");
    } catch (error) {
      showRoomActionError(error);
    }
  }

  async function handleSubmitReply(event) {
    event.preventDefault();
    await submitReply();
  }

  async function handleSelectEmoji(emoji) {
    if (!emojiTarget) {
      return;
    }

    try {
      const reactionState = await addFitLogReaction(user, roomCode, emojiTarget.id, { emoji });
      applyRoomState(reactionState);
      await sendQuotedChatMessage(emojiTarget, emoji, "EMOJI");
      setEmojiTarget(null);
    } catch (error) {
      showRoomActionError(error);
    }
  }

  async function handleSubmitChat(event) {
    event.preventDefault();

    const trimmedMessage = chatText.trim();

    if (!trimmedMessage) {
      return;
    }

    try {
      const state = await sendFitRoomMessage(user, roomCode, {
        text: trimmedMessage,
        type: "TEXT",
      });
      applyRoomState(state);
      setChatText("");
    } catch (error) {
      showRoomActionError(error);
    }
  }

  return (
    <main className="fit-room-main">
      <section className="fit-room-header" aria-labelledby="fit-room-title">
        <button
          className="fit-room-back-button"
          type="button"
          aria-label="Back to room list"
          onClick={onExitRoom}
        >
          <img src={backWhiteButtonImage} alt="" aria-hidden="true" />
        </button>
        <div className="fit-room-title-group">
          <h1 id="fit-room-title">{roomName}</h1>
          <p>{todayLabel}</p>
        </div>
        <button
          className="fit-room-more-button"
          type="button"
          aria-label="방 메뉴 열기"
          onClick={() => setIsDetailModalOpen(true)}
        >
          <img src={detailButtonImage} alt="" aria-hidden="true" />
        </button>
      </section>

      <section className="fit-member-grid" aria-label="방 인원 오늘의 핏">
        {members.map((member) => (
          <FitMemberCard
            member={member}
            reactionEmoji={fitReactions[member.id]}
            key={member.id}
            onOpenReply={(target) => {
              setReplyTarget(target);
              setReplyText("");
            }}
            onOpenEmoji={(target) => {
              setEmojiTarget(target);
              setSelectedEmojiCategoryId(emojiCategories[0].id);
            }}
            onOpenUpload={openUploadModal}
            onOpenFitMenu={(target) => setFitMenuTarget(target)}
          />
        ))}
        {inviteSlots.map((slot) => (
          <FitInviteSlotCard key={slot.id} onInvite={handleShareInvite} />
        ))}
      </section>

      <button
        className="fit-floating-chat-button"
        type="button"
        aria-label="채팅 열기"
        onClick={() => setIsChatOpen(true)}
      >
        <img src={chatButtonImage} alt="" aria-hidden="true" />
      </button>

      <input
        ref={cameraInputRef}
        className="fit-hidden-file-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleSelectFitImage}
      />
      <input
        ref={imageInputRef}
        className="fit-hidden-file-input"
        type="file"
        accept="image/*"
        onChange={handleSelectFitImage}
      />
      <input
        ref={profileInputRef}
        className="fit-hidden-file-input"
        type="file"
        accept="image/*"
        onChange={handleSelectProfileImage}
      />

      <Modal
        isOpen={isDetailModalOpen}
        titleId="fit-detail-modal-title"
        className="fit-detail-modal"
        onClose={() => setIsDetailModalOpen(false)}
      >
        <h2 id="fit-detail-modal-title">방 상세</h2>
        <div className="fit-detail-sections">
          <section className="fit-detail-section">
            <h3>내 프로필</h3>
            <div className="fit-detail-profile-row">
              <img src={profileImage} alt="" aria-hidden="true" />
              <button type="button" onClick={() => profileInputRef.current?.click()}>
                프로필 사진 변경
              </button>
            </div>
          </section>

          <section className="fit-detail-section">
            <h3>친구 초대</h3>
            <div className="fit-detail-invite-row">
              <p>초대 링크를 공유해 친구를 방에 초대하세요.</p>
              <button type="button" onClick={handleShareInvite}>
                초대 링크 공유
              </button>
            </div>
          </section>

          <section className="fit-detail-section">
            <h3>방 코드</h3>
            <div className="fit-detail-code-row">
              <code>#{roomCode}</code>
              <button type="button" onClick={handleCopyRoomCode}>
                코드 복사
              </button>
            </div>
          </section>

          <section className="fit-detail-section">
            <h3>멤버</h3>
            <ul className="fit-detail-member-list">
              {members.map((member) => (
                <li key={member.id}>
                  <span>
                    {member.name}
                    {member.isHost ? " (방장)" : ""}
                  </span>
                  {isRoomHost && !member.isCurrentUser && (
                    <button type="button" onClick={() => setConfirmAction({ type: "kick", member })}>
                      내보내기
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </section>

          <section className="fit-detail-section">
            <h3>설정</h3>
            {isRoomHost && (
              <form className="fit-room-name-form" onSubmit={handleSaveRoomName}>
                <label htmlFor="fit-room-name-input">방 이름</label>
                {roomNameError && <em className="fit-room-name-error">{roomNameError}</em>}
                <div>
                  <input
                    id="fit-room-name-input"
                    type="text"
                    value={roomNameInput}
                    onChange={(event) => {
                      setRoomNameInput(event.target.value);
                      if (roomNameError) {
                        setRoomNameError("");
                      }
                    }}
                  />
                  <button type="submit">수정</button>
                </div>
              </form>
            )}
            <div className="fit-detail-danger-actions">
              {isRoomHost ? (
                <div className="fit-detail-setting-row is-danger">
                  <span>
                    <strong>방 삭제</strong>
                    <small>방과 모든 핏로그 기록을 삭제합니다.</small>
                  </span>
                  <button type="button" onClick={() => setConfirmAction({ type: "delete" })}>
                    삭제
                  </button>
                </div>
              ) : (
                <div className="fit-detail-setting-row">
                  <span>
                    <strong>방 나가기</strong>
                    <small>내 방 목록에서 이 방을 나갑니다.</small>
                  </span>
                  <button type="button" onClick={() => setConfirmAction({ type: "leave" })}>
                    나가기
                  </button>
                </div>
              )}
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(confirmAction)}
        titleId="fit-room-confirm-title"
        className="fit-room-confirm-modal"
        onClose={closeConfirmAction}
        onConfirm={handleConfirmRoomAction}
      >
        <h2 id="fit-room-confirm-title">확인</h2>
        <p>
          {confirmAction?.type === "kick" && `${confirmAction.member.name}님을 내보내시겠습니까?`}
          {confirmAction?.type === "delete" && "방을 삭제하시겠습니까?"}
          {confirmAction?.type === "leave" && "방에서 나가시겠습니까?"}
          {confirmAction?.type === "deleteFit" && "올렸던 룩을 삭제하시겠습니까?"}
        </p>
        <div className="fit-room-modal-actions">
          <button type="button" className="fit-room-cancel-button" onClick={closeConfirmAction}>
            취소
          </button>
          <button type="button" className="fit-room-submit-button" onClick={handleConfirmRoomAction}>
            확인
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(roomActionMessage)}
        titleId="fit-room-action-result-title"
        className="fit-invite-result-modal"
        onClose={() => setRoomActionMessage("")}
        onConfirm={() => setRoomActionMessage("")}
      >
        <h2 id="fit-room-action-result-title">알림</h2>
        <p>{roomActionMessage}</p>
        <button
          className="fit-room-submit-button fit-invite-result-confirm"
          type="button"
          onClick={() => setRoomActionMessage("")}
        >
          확인
        </button>
      </Modal>

      <Modal
        isOpen={Boolean(entryNotice)}
        titleId="fit-room-entry-result-title"
        className="fit-invite-result-modal"
        onClose={onEntryNoticeDismiss}
        onConfirm={onEntryNoticeDismiss}
      >
        <h2 id="fit-room-entry-result-title">참여 완료</h2>
        <p>{entryNotice}</p>
        <button
          className="fit-room-submit-button fit-invite-result-confirm"
          type="button"
          onClick={onEntryNoticeDismiss}
        >
          확인
        </button>
      </Modal>

      <Modal
        isOpen={isUploadModalOpen}
        titleId="fit-upload-modal-title"
        className="fit-upload-modal"
        onClose={closeUploadModal}
      >
        <h2 id="fit-upload-modal-title">로그 작성</h2>
        {selectedFitImagePreview && (
          <div className="fit-upload-preview">
            <img src={selectedFitImagePreview} alt="저장할 오늘의 핏 미리보기" />
          </div>
        )}
        <label className="fit-upload-caption-field">
          <span>캡션</span>
          <textarea
            value={uploadCaptionInput}
            placeholder="오늘의 룩에 대한 캡션을 입력하세요"
            onChange={(event) => setUploadCaptionInput(event.target.value)}
          />
        </label>
        <div className="fit-upload-options">
          <button type="button" disabled={isSavingFitLog} onClick={() => cameraInputRef.current?.click()}>
            📷 카메라
          </button>
          <button type="button" disabled={isSavingFitLog} onClick={() => imageInputRef.current?.click()}>
            이미지 올리기
          </button>
        </div>
        <div className="fit-room-modal-actions fit-upload-actions">
          <button
            type="button"
            className="fit-room-cancel-button"
            disabled={isSavingFitLog}
            onClick={closeUploadModal}
          >
            취소
          </button>
          <button
            type="button"
            className="fit-room-submit-button"
            disabled={!selectedFitImageFile || isSavingFitLog}
            onClick={handleSaveFitLog}
          >
            {isSavingFitLog ? "저장 중..." : "저장하기"}
          </button>
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(fitMenuTarget)}
        titleId="fit-menu-modal-title"
        className="fit-menu-modal"
        onClose={() => setFitMenuTarget(null)}
      >
        <h2 id="fit-menu-modal-title">로그 관리</h2>
        <div className="fit-menu-actions">
          <button type="button" onClick={() => handleOpenCaptionEdit(fitMenuTarget)}>
            캡션 수정
          </button>
          <button
            className="is-danger"
            type="button"
            onClick={() => {
              setConfirmAction({ type: "deleteFit" });
              setFitMenuTarget(null);
            }}
          >
            삭제
          </button>
        </div>
        <div className="fit-menu-reactions" aria-label="받은 이모지 반응">
          {(fitReactionDetails[fitMenuTarget?.id] || []).length > 0 ? (
            fitReactionDetails[fitMenuTarget?.id].map((reaction, index) => (
              <p key={`${reaction.sender}-${reaction.emoji}-${index}`}>
                {reaction.sender}: {reaction.emoji}
              </p>
            ))
          ) : (
            <p>받은 이모지 반응이 없습니다.</p>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(captionEditTarget)}
        titleId="fit-caption-edit-title"
        className="fit-caption-edit-modal"
        onClose={() => setCaptionEditTarget(null)}
      >
        <h2 id="fit-caption-edit-title">캡션 수정</h2>
        <form className="fit-caption-edit-form" onSubmit={handleSaveCaptionEdit}>
          <textarea
            value={captionEditText}
            placeholder="캡션을 입력하세요"
            data-autofocus
            onChange={(event) => setCaptionEditText(event.target.value)}
          />
          <div className="fit-room-modal-actions">
            <button
              type="button"
              className="fit-room-cancel-button"
              onClick={() => setCaptionEditTarget(null)}
            >
              취소
            </button>
            <button type="submit" className="fit-room-submit-button">
              저장
            </button>
          </div>
        </form>
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
          className="fit-room-submit-button fit-invite-result-confirm"
          type="button"
          onClick={() => setInviteShareMessage("")}
        >
          확인
        </button>
      </Modal>

      <Modal
        isOpen={Boolean(replyTarget)}
        titleId="fit-reply-modal-title"
        className="fit-reply-modal"
        onClose={() => setReplyTarget(null)}
        onConfirm={() => {
          void submitReply();
        }}
      >
        <h2 id="fit-reply-modal-title">답장하기</h2>
        <form className="fit-reply-form" onSubmit={handleSubmitReply}>
          <textarea
            value={replyText}
            placeholder="코디에 대한 답장을 입력하세요"
            data-autofocus
            onChange={(event) => setReplyText(event.target.value)}
          />
          <div className="fit-room-modal-actions">
            <button type="button" className="fit-room-cancel-button" onClick={() => setReplyTarget(null)}>
              취소
            </button>
            <button type="submit" className="fit-room-submit-button">
              답장
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(emojiTarget)}
        titleId="fit-emoji-modal-title"
        className="fit-emoji-modal"
        onClose={() => setEmojiTarget(null)}
      >
        <h2 id="fit-emoji-modal-title">이모지 보내기</h2>
        <div className="fit-emoji-picker" aria-label="이모지 선택">
          <div className="fit-emoji-tabs" role="tablist" aria-label="이모지 카테고리">
            {emojiCategories.map((category) => (
              <button
                className={selectedEmojiCategoryId === category.id ? "is-active" : ""}
                type="button"
                role="tab"
                aria-selected={selectedEmojiCategoryId === category.id}
                title={category.label}
                key={category.id}
                onClick={() => setSelectedEmojiCategoryId(category.id)}
              >
                <span aria-hidden="true">{category.icon}</span>
                <span className="sr-only">{category.label}</span>
              </button>
            ))}
          </div>
          <section className="fit-emoji-section" aria-labelledby="fit-category-emoji-title">
            <h3 id="fit-category-emoji-title">{selectedEmojiCategory.label}</h3>
            <div className="fit-emoji-grid">
              {selectedEmojiCategory.emojis.map((emoji) => (
                <button type="button" key={emoji} onClick={() => handleSelectEmoji(emoji)}>
                  {emoji}
                </button>
              ))}
            </div>
          </section>
        </div>
      </Modal>

      <Modal
        isOpen={isChatOpen}
        titleId="fit-chat-modal-title"
        className="fit-chat-modal"
        onClose={() => setIsChatOpen(false)}
      >
        <h2 id="fit-chat-modal-title">방 채팅</h2>
        <div className="fit-chat-messages" ref={setChatMessagesElement}>
          {chatMessages.map((message) => (
            <p
              className={message.author === "나" || message.author === currentUserName ? "is-me" : ""}
              key={message.id}
            >
              {message.quote && (
                <span className="fit-chat-quote">
                  {message.quote.image && <img src={message.quote.image} alt="" aria-hidden="true" />}
                  <span>
                    <strong>{message.quote.author}</strong>
                    <small>{message.quote.text}</small>
                  </span>
                </span>
              )}
              <strong>{message.author}</strong>
              <span>{message.text}</span>
            </p>
          ))}
        </div>
        <form className="fit-chat-form" onSubmit={handleSubmitChat}>
          <input
            type="text"
            value={chatText}
            placeholder="메시지를 입력하세요"
            onChange={(event) => setChatText(event.target.value)}
          />
          <button type="submit">전송</button>
        </form>
      </Modal>
    </main>
  );
}

export default FitLogRoomPage;
