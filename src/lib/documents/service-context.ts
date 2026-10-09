// O número do voo não define o sentido do transfer: saídas também têm voo.
export function serviceDocumentContext(type: string) {
  if (type === "transfer_chegada") {
    return {
      pickupLabel: "Aeroporto / origem",
      dropoffLabel: "Destino / hospedagem",
      timeLabel: "Chegada / horário previsto",
      flightLabel: "Voo de chegada",
      meeting: "Ponto de encontro: área de desembarque do aeroporto, após a retirada das bagagens. O motorista estará identificado com a plaquinha de recepção quando contratada.",
      instruction: "Após desembarcar, retire as bagagens e encontre o motorista na área de desembarque. Mantenha o telefone disponível e comunique atrasos à Nativos.",
      driverInstruction: "Acompanhar o voo de chegada e aguardar o passageiro na área de desembarque após a retirada das bagagens.",
    };
  }
  if (type === "transfer_saida") {
    return {
      pickupLabel: "Local de embarque / hospedagem",
      dropoffLabel: "Aeroporto / destino",
      timeLabel: "Embarque / saída do transfer",
      flightLabel: "Voo de saída",
      meeting: "Ponto de encontro: local de embarque indicado acima. O horário do transfer é o horário de saída desse local, não o horário do voo.",
      instruction: "Aguarde no local de embarque com as bagagens prontas, 10 minutos antes do horário do transfer. Confira com a equipe a antecedência necessária para o voo.",
      driverInstruction: "Buscar o passageiro no local de embarque no horário do transfer e seguir ao aeroporto; conferir a antecedência acordada para o voo de saída.",
    };
  }
  return {
    pickupLabel: "Local de embarque / origem",
    dropoffLabel: "Destino",
    timeLabel: "Data e horário do serviço",
    flightLabel: "Voo informado",
    meeting: "Ponto de encontro: local de embarque indicado acima, conforme combinado com a equipe Nativos.",
    instruction: "Esteja no local de encontro combinado 10 minutos antes do horário do serviço, com o telefone disponível.",
    driverInstruction: "Confirmar local de encontro, destino, horário e roteiro contratado com a operação antes do início.",
  };
}
