// Global socket
socket = io();

function ErrorBanner(props) {
  const { msg, onClear } = props;

  return msg ? (
    <section id="error-banner">
      {msg} <button onClick={onClear}>Clear</button>
    </section>
  ) : null;
}

function LobbySelection() {
  const [roomName, setRoomName] = React.useState("");

  function onCreateLobby() {
    if (roomName) {
      socket.emit("create lobby", roomName);
      setRoomName("");
    }
  }

  function onJoinLobby() {
    if (roomName) {
      socket.emit("join lobby", roomName);
      setRoomName("");
    }
  }

  return (
    <section id="choose-lobby">
      <input
        id="room-input"
        autoComplete="off"
        onChange={({ target: { value } }) => setRoomName(value)}
        value={roomName}
      />
      <button id="create-btn" onClick={onCreateLobby}>
        Create
      </button>
      <button id="join-btn" onClick={onJoinLobby}>
        Join
      </button>
      <p></p>
    </section>
  );
}

function InLobby(props) {
  const { lobby } = props;

  function onEditNickname() {
    const newNickname = window.prompt("New name:");
    socket.emit("set nickname", newNickname);
  }

  function onLaunchGame() {
    socket.emit("launch game");
  }

  return (
    <section id="in-lobby">
      <h2>
        In lobby <span id="lobby-name">{lobby.name}</span>
      </h2>

      <h3>Players</h3>
      <ul id="messages">
        {Object.entries(lobby.nicknames).map(([id, nickname]) => (
          <li key={id}>
            {nickname}
            {socket.id === id ? (
              <React.Fragment>
                <strong> (me) </strong>
                {!lobby.locked ? (
                  <button onClick={onEditNickname}>edit</button>
                ) : null}
              </React.Fragment>
            ) : null}
          </li>
        ))}
      </ul>
      {lobby.host === socket.id && !lobby.locked ? (
        <React.Fragment>
          <h3>Launch game</h3>
          <button onClick={onLaunchGame}>Launch</button>
        </React.Fragment>
      ) : null}
    </section>
  );
}

function ChooseMysteryName(props) {
  const { lobby } = props;
  const [mysteryName, setMysteryName] = React.useState("");
  const [hasSubmitted, setHasSubmitted] = React.useState(false);

  function onSubmit() {
    socket.emit("choose mystery", mysteryName);
    setHasSubmitted(true);
  }

  const haveChosenCount = Object.values(lobby.mysteryNames).length;
  const totalPlayerCount = Object.values(lobby.nicknames).length;

  return (
    <React.Fragment>
      <h3>Choose your Mystery Name</h3>
      {hasSubmitted ? (
        <p>
          You have chosen:<strong>{mysteryName}</strong>
        </p>
      ) : (
        <React.Fragment>
          <input
            onChange={({ target: { value } }) => setMysteryName(value)}
            value={mysteryName}
          />
          <button onClick={onSubmit}>Submit</button>
        </React.Fragment>
      )}
      {haveChosenCount < totalPlayerCount ? (
        <p>
          Have chosen: {haveChosenCount} / {totalPlayerCount}
        </p>
      ) : null}
    </React.Fragment>
  );
}

function BlameCard(props) {
  const { lobby, socketId } = props;
  const [blamedId, setBlamedId] = React.useState("none");

  const mysteryName = lobby.mysteryNames[socketId];
  const isAlreadyOwned = !!lobby.ownedBy[socketId];
  const isInTurn = socket.id === lobby.turnOfPlayer;
  const notOwnedPlayerIds = Object.keys(lobby.nicknames).filter(
    (pId) => !lobby.ownedBy[pId]
  );

  function onChange({ target: { value } }) {
    setBlamedId(value);
  }

  function onSubmit() {
    socket.emit("blame", mysteryName, blamedId);
  }

  return (
    <li>
      {mysteryName}
      {isInTurn && !isAlreadyOwned ? (
        <React.Fragment>
          <select value={blamedId} onChange={onChange}>
            <option disabled={true} value={"none"}>
              Choose a player
            </option>
            {notOwnedPlayerIds
              .filter((pId) => pId !== socket.id)
              .map((playerId) => (
                <option key={playerId} value={playerId}>
                  {lobby.nicknames[playerId]}
                </option>
              ))}
          </select>
          <button onClick={onSubmit}>Blame</button>
        </React.Fragment>
      ) : null}
      {isAlreadyOwned ? (
        <p>
          Was: <strong>{lobby.nicknames[socketId]}</strong>
        </p>
      ) : null}
    </li>
  );
}

function BlameTheMysteries(props) {
  const { lobby } = props;

  const isPlayerOwned = !!lobby.ownedBy[socket.id];
  const playerYouOwned = Object.entries(lobby.ownedBy).filter(
    ([owneeId, ownerId]) => ownerId === socket.id
  );

  return (
    <React.Fragment>
      <h3>Who wrote what?</h3>
      <p>Whose turn is it to blame: {lobby.nicknames[lobby.turnOfPlayer]}</p>
      <ul>
        {lobby.displayOrder.map((socketId) => (
          <BlameCard key={socketId} socketId={socketId} lobby={lobby} />
        ))}
      </ul>
      {isPlayerOwned ? (
        <p>You were owned by {lobby.nicknames[lobby.ownedBy[socket.id]]}</p>
      ) : null}
      {playerYouOwned.length > 0 ? (
        <p>
          You owned:
          <ul>
            {playerYouOwned.map(([owneeId, ownerId]) => (
              <li key={owneeId}>{lobby.nicknames[owneeId]}</li>
            ))}
          </ul>
        </p>
      ) : null}
    </React.Fragment>
  );
}

class App extends React.PureComponent {
  constructor() {
    super();
    this.state = {
      appState: "CHOOSE_LOBBY",
      lobby: null,
      errorMsg: null,
    };

    socket.on("error", (data) => {
      this.setState({ errorMsg: data });
    });

    socket.on("joined lobby", (data) => {
      this.setState({ appState: "IN_LOBBY", lobby: data });
    });

    socket.on("updated lobby", (data) => {
      this.setState({ lobby: data });
    });
  }

  render() {
    const { appState, errorMsg, lobby } = this.state;

    return (
      <React.Fragment>
        <h1>Le jeu de l'empereur</h1>

        <ErrorBanner
          msg={errorMsg}
          onClear={() => this.setState({ errorMsg: null })}
        />
        {appState === "CHOOSE_LOBBY" ? <LobbySelection /> : null}
        {appState === "IN_LOBBY" ? (
          <React.Fragment>
            <InLobby lobby={lobby} />
            {lobby.locked ? <ChooseMysteryName lobby={lobby} /> : null}
            {lobby.phase1Locked ? <BlameTheMysteries lobby={lobby} /> : null}
            {lobby.andTheWinnerIs ? (
              <React.Fragment>
                <h3>And the Winner is...</h3>
                <p class="winner-name">
                  {lobby.nicknames[lobby.andTheWinnerIs]}
                </p>
              </React.Fragment>
            ) : null}
          </React.Fragment>
        ) : null}
      </React.Fragment>
    );
  }
}

const app = <App />;
ReactDOM.render(app, document.getElementById("main"));
