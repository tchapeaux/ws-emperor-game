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
        Create room
      </button>
      <button id="join-btn" onClick={onJoinLobby}>
        Join room
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

  function onKick(kickedId) {
    socket.emit("kick player", kickedId);
  }

  const nbOfPlayers = Object.keys(lobby.nicknames).length;
  const canLaunch = nbOfPlayers > 3;
  const isHost = socket.id === lobby.host;

  return (
    <section id="in-lobby">
      <h2>
        Your room: <span id="lobby-name">{lobby.name}</span>
      </h2>

      {isHost ? (
        <p>You are the host.</p>
      ) : (
        <p>{lobby.nicknames[lobby.host]} is the host</p>
      )}

      <h3>Players</h3>
      <ul id="messages">
        {Object.entries(lobby.nicknames).map(([id, nickname]) => {
          const isDisconnected = lobby.disconnected.includes(id);

          return (
            <li key={id}>
              😸 {nickname}
              {socket.id === id ? (
                <React.Fragment>
                  <strong> (you) </strong>
                  {!lobby.locked ? (
                    <button onClick={onEditNickname}>change name</button>
                  ) : null}
                </React.Fragment>
              ) : null}
              {isHost && !lobby.locked && socket.id !== id ? (
                <React.Fragment>
                  {" "}
                  <button className={"danger"} onClick={() => onKick(id)}>
                    kick
                  </button>
                </React.Fragment>
              ) : null}
              {isDisconnected ? (
                <React.Fragment>{" (disconnected)"}</React.Fragment>
              ) : null}
            </li>
          );
        })}
      </ul>
      {isHost && !lobby.locked ? (
        <React.Fragment>
          <h3>Launch game</h3>
          {canLaunch ? null : <p>You need at least 4 players to launch</p>}
          <button disabled={!canLaunch} onClick={onLaunchGame}>
            Launch
          </button>
        </React.Fragment>
      ) : null}
      {!isHost && !lobby.locked ? (
        <p>Waiting for the host to launch the game</p>
      ) : null}
    </section>
  );
}

function ChooseMysteryName(props) {
  const { lobby } = props;
  const [mysteryName, setMysteryName] = React.useState("");

  const submittedName = lobby.mysteryNames[socket.id];
  const hasSubmitted = !!submittedName;

  function onSubmit() {
    socket.emit("choose mystery", mysteryName);
    setMysteryName("");
  }

  const haveChosenCount = Object.values(lobby.mysteryNames).length;
  const totalPlayerCount = Object.values(lobby.nicknames).length;

  return (
    <section id="choose-your-mystery">
      <h3>Choose your Mystery Name</h3>
      {hasSubmitted ? (
        <p>
          You have chosen: <strong>{submittedName}</strong>
        </p>
      ) : (
        <React.Fragment>
          <input
            onChange={({ target: { value } }) => setMysteryName(value)}
            value={mysteryName}
          />
          <button
            disabled={!mysteryName || mysteryName.length === 0}
            onClick={onSubmit}
          >
            Submit
          </button>
        </React.Fragment>
      )}
      {haveChosenCount < totalPlayerCount ? (
        <p>
          Have chosen: {haveChosenCount} / {totalPlayerCount}
        </p>
      ) : null}
    </section>
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

  const classNames = ["blameCard"];
  if (isAlreadyOwned) {
    classNames.push("guessed");
  }

  return (
    <li className={classNames.join(" ")}>
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
          <button onClick={onSubmit}>Guess</button>
        </React.Fragment>
      ) : null}
      {isAlreadyOwned ? (
        <React.Fragment>
          <p>
            Was: <strong>{lobby.nicknames[socketId]}</strong>
          </p>
          <p>
            Guessed by:{" "}
            <strong>{lobby.nicknames[lobby.ownedBy[socketId]]}</strong>
          </p>
        </React.Fragment>
      ) : null}
    </li>
  );
}

function BlameTheMysteries(props) {
  const { lobby } = props;

  const isInTurn = socket.id === lobby.turnOfPlayer;

  return (
    <React.Fragment>
      <h3>Who wrote what?</h3>
      {lobby.turnOfPlayer ? (
        <p>
          It's{" "}
          <strong>
            {isInTurn ? "your" : `${lobby.nicknames[lobby.turnOfPlayer]}'s`}
          </strong>{" "}
          turn to guess.
        </p>
      ) : null}
      {lobby.lastAction ? (
        <p>
          <strong>Last action:</strong> {lobby.lastAction}
        </p>
      ) : null}

      <ul className="mysteryList">
        {lobby.displayOrder.map((socketId) => (
          <BlameCard key={socketId} socketId={socketId} lobby={lobby} />
        ))}
      </ul>
    </React.Fragment>
  );
}

function YourTeam(props) {
  const { lobby } = props;
  const isPlayerOwned = !!lobby.ownedBy[socket.id];

  // Explore the ownedBy directional graph to find all nodes that can be reached
  let teamMemberIds = [socket.id];
  while (true) {
    let hasAddedMember = false;
    for (const [owneeId, ownerId] of Object.entries(lobby.ownedBy)) {
      if (teamMemberIds.includes(ownerId) && !teamMemberIds.includes(owneeId)) {
        teamMemberIds.push(owneeId);
        hasAddedMember = true;
      }
      if (teamMemberIds.includes(owneeId) && !teamMemberIds.includes(ownerId)) {
        teamMemberIds.push(ownerId);
        hasAddedMember = true;
      }
    }
    if (!hasAddedMember) {
      break;
    }
  }

  const teamLeaderId = teamMemberIds.find((id) => !lobby.ownedBy[id]);

  return (
    <section id="yourTeam">
      <h3>Your team</h3>
      {teamMemberIds.length === 1 ? (
        <p>Your team is currently empty</p>
      ) : (
        <ul>
          {teamMemberIds
            .filter((id) => id !== socket.id)
            .map((teamMemberId) => (
              <React.Fragment>
                <li key={teamMemberId}>
                  {lobby.nicknames[teamMemberId]}
                  {" : "}
                  {lobby.mysteryNames[teamMemberId]}
                  {teamMemberId === teamLeaderId ? (
                    <strong> (leader)</strong>
                  ) : null}
                </li>
              </React.Fragment>
            ))}
        </ul>
      )}
    </section>
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

    socket.on("you were kicked", () => {
      this.setState({
        appState: "CHOOSE_LOBBY",
        lobby: undefined,
        errorMsg: "You were kicked by the host",
      });
    });

    // auto-join lobby if there is a lobby= URL parameter
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const lobbyParam = urlParams.get("lobby");
    if (lobbyParam) {
      socket.emit("join lobby", lobbyParam);
    }
  }

  render() {
    const { appState, errorMsg, lobby } = this.state;

    return (
      <React.Fragment>
        <h1>The Emperor's Game</h1>

        <details>
          <summary>Rules</summary>
          <ul>
            <li>🎧 Best played while on a call with your friends</li>
            <li>👋 Create a lobby and invite your friends</li>
            <li>
              👻 Each player choses a mystery name (famous people, fictional
              people, whatev.)
            </li>
            <li>🎯 Guess which player wrote one of the mystery names</li>
            <li>❌ If you guess wrong, it's their turn to guess</li>
            <li>
              ✅ If you guess right, they are eliminated, and you keep guessing
            </li>
          </ul>
        </details>

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
            {lobby.phase1Locked ? <YourTeam lobby={lobby} /> : null}
            {lobby.andTheWinnerIs ? (
              <React.Fragment>
                <h3>And the Winner is...</h3>
                <p class="winner-name">
                  {"🌟"}
                  {lobby.nicknames[lobby.andTheWinnerIs]}
                  {"🌟"}
                </p>

                {lobby.host === socket.id ? (
                  <p>
                    <button onClick={() => socket.emit("restart game")}>
                      Restart
                    </button>
                  </p>
                ) : null}
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
