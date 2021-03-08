function ErrorBanner(props) {
  const { msg } = props;

  return msg ? <section id="error-banner">{msg}</section> : null;
}

function LobbySelection(props) {
  const { socket } = props;
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

  return (
    <section id="in-lobby">
      <h2>
        In lobby <span id="lobby-name">{lobby.name}</span>
      </h2>

      <h3>Players</h3>
      <ul id="messages">
        {Object.entries(lobby.nicknames).map(([id, nickname]) => (
          <li key={id}>{nickname}</li>
        ))}
      </ul>
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

    this.socket = io();
    this.socket.on("error", (data) => {
      this.setState({ errorMsg: data });
    });

    this.socket.on("joined lobby", (data) => {
      this.setState({ appState: "IN_LOBBY", lobby: data });
    });

    this.socket.on("updated lobby", (data) => {
      this.setState({ lobby: data });
    });
  }

  render() {
    return (
      <React.Fragment>
        <h1>Le jeu de l'empereur</h1>

        <ErrorBanner msg={this.state.errorMsg} />
        {this.state.appState === "CHOOSE_LOBBY" ? (
          <LobbySelection socket={this.socket} />
        ) : null}
        {this.state.appState === "IN_LOBBY" ? (
          <InLobby lobby={this.state.lobby} />
        ) : null}
      </React.Fragment>
    );
  }
}

const app = <App />;
ReactDOM.render(app, document.getElementById("main"));
