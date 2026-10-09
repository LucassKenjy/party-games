export default function RoleRevealScreen({ role, onContinue }) {
  const isImpostor = role.role === "impostor";

  return (
    <div className="screen screen--reveal">
      <h2>Tema: {role.theme}</h2>
      {isImpostor ? (
        <div className="role-card role-card--impostor">
          <p>Você é o IMPOSTOR</p>
          <p className="hint">Preste atenção nas dicas dos outros e tente se misturar.</p>
        </div>
      ) : (
        <div className="role-card">
          <p>A palavra secreta é:</p>
          <p className="role-card__word">{role.word}</p>
        </div>
      )}
      <button className="btn btn--primary" onClick={onContinue}>
        Entendi, continuar
      </button>
    </div>
  );
}
