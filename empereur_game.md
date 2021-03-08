# Le jeu de l'empereur

States and actions:

- JUST_JOINED
	- create_lobby
	- join_lobby
- IN_LOBBY
	- choose_own_nickname(newNickname)
	- leave
	- start
- CHOOSE_NAME
	- submit(name)
- ACCUSATION
	- accuse(player, name)
- END_STATE

