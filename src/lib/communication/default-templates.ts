export type DefaultEmailTemplate = {
  key: string;
  name: string;
  subject: string;
  category: string;
  allowed_variables: string[];
  body: string;
};

const shell = (content: string) => `
<div style="margin:0;background:#f5f4ef;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;color:#263b35">
  <div style="max-width:600px;margin:0 auto;background:#fff;border:1px solid #e6e2d9;border-radius:16px;overflow:hidden">
    <div style="padding:24px 28px;border-bottom:1px solid #eee9df;text-align:center">
      <div style="font-family:Georgia,serif;font-size:34px;font-style:italic;color:#263b35;letter-spacing:-1px">nativos</div>
      <div style="margin-top:6px;font-size:10px;letter-spacing:2px;color:#ad9564;text-transform:uppercase">experiences</div>
    </div>
    <div style="padding:32px 28px">${content}</div>
    <div style="padding:18px 28px;background:#faf9f6;border-top:1px solid #eee9df;color:#72807b;font-size:12px;line-height:1.5;text-align:center">
      Nativos Experiences · Trancoso, Bahia<br/>Esta é uma comunicação transacional da sua reserva.
    </div>
  </div>
</div>`;

const button = (label: string) => `<a href="{{link}}" style="display:inline-block;background:#263b35;color:#fff;text-decoration:none;border-radius:8px;padding:13px 18px;font-weight:700;font-size:14px">${label}</a>`;
const title = (text: string) => `<h1 style="margin:0 0 12px;font-size:24px;line-height:1.2;color:#263b35">${text}</h1>`;
const text = (value: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.65;color:#56645f">${value}</p>`;
const card = (label: string, value: string) => `<div style="margin:8px 0;padding:12px 14px;background:#faf9f6;border-radius:8px"><div style="font-size:11px;color:#84908a;text-transform:uppercase;letter-spacing:.7px">${label}</div><div style="margin-top:4px;font-size:15px;font-weight:700;color:#263b35">${value}</div></div>`;
const sectionTitle = (value: string) => `<h2 style="margin:24px 0 10px;font-size:16px;color:#263b35">${value}</h2>`;
const instructions = (items: string[]) => `<ol style="margin:0 0 18px;padding-left:20px;color:#56645f;font-size:14px;line-height:1.7">${items.map((item) => `<li style="margin:0 0 7px">${item}</li>`).join("")}</ol>`;
const note = (value: string) => `<div style="margin:18px 0;padding:14px 16px;background:#f4efe3;border-left:3px solid #ad9564;border-radius:8px;color:#665938;font-size:13px;line-height:1.6">${value}</div>`;
const signoff = (value = "Conte com a Nativos Experiences para cuidar de cada detalhe da sua experiência.") => `${text(value)}<p style="margin:22px 0 0;font-size:14px;line-height:1.6;color:#263b35"><strong>Atenciosamente,</strong><br/>Equipe Nativos Experiences<br/><a href="https://wa.me/{{whatsapp}}" style="color:#806a3c;text-decoration:none">Falar com nossa equipe</a></p>`;

export const DEFAULT_EMAIL_TEMPLATES: DefaultEmailTemplate[] = [
  {
    key: "fornecedor_novo_servico",
    name: "Novo serviço para fornecedor",
    subject: "Novo serviço disponível · {{codigo_reserva}}",
    category: "operacional",
    allowed_variables: ["nome", "codigo_reserva", "data_servico", "horario", "origem", "destino", "categoria", "link", "whatsapp"],
    body: shell(`${title("Novo serviço disponível")} ${text("Olá, {{nome}}. Esperamos que esteja bem. Temos uma nova operação disponível para sua empresa e gostaríamos de contar com seu atendimento.")} ${card("Reserva", "{{codigo_reserva}}")} ${card("Data e horário", "{{data_servico}} · {{horario}}")}${card("Rota", "{{origem}} → {{destino}}")}${card("Categoria solicitada", "{{categoria}}")} ${sectionTitle("Antes de confirmar")} ${instructions(["Confira atentamente data, horário, rota e categoria solicitada.", "Valide a disponibilidade do veículo e do motorista adequados para o serviço.", "Acesse o portal para informar motorista e veículo e confirmar o atendimento.", "Comunique qualquer impedimento ou necessidade de ajuste antes de aceitar a operação."])} ${note("Os dados completos do passageiro e as orientações operacionais ficam disponíveis no portal. Não compartilhe informações da reserva com terceiros.")}<div style="margin-top:22px">${button("Revisar e responder")}</div>${signoff("Agradecemos pela parceria e pelo cuidado com o padrão de atendimento da Nativos.")}`),
  },
  {
    key: "motorista_servico_atribuido",
    name: "Serviço atribuído ao motorista",
    subject: "Novo serviço atribuído · {{codigo_reserva}}",
    category: "operacional",
    allowed_variables: ["nome", "codigo_reserva", "data_servico", "horario", "origem", "destino", "link", "whatsapp"],
    body: shell(`${title("Você tem um novo serviço")} ${text("Olá, {{nome}}. Um novo serviço foi atribuído a você. Obrigado por fazer parte da operação Nativos.")} ${card("Reserva", "{{codigo_reserva}}")}${card("Data e horário", "{{data_servico}} · {{horario}}")}${card("Rota", "{{origem}} → {{destino}}")} ${sectionTitle("Orientações para o atendimento")} ${instructions(["Abra a OS no portal e confira passageiro, contatos, bagagens, observações e forma de recebimento.", "Apresente-se no local de embarque com 10 a 15 minutos de antecedência, veículo limpo e apresentação adequada.", "Quando houver recepção, utilize a plaquinha disponível na reserva.", "Inicie e finalize o serviço pelo portal nos horários reais da operação.", "Registre despesas e ocorrências com o comprovante correspondente antes de encerrar."])} ${note("Só realize cobrança direta quando a OS indicar expressamente o valor a receber. Em caso de divergência, fale com a operação antes de abordar o passageiro.")}<div style="margin-top:22px">${button("Abrir serviço e OS")}</div>${signoff("Desejamos um excelente atendimento e uma operação segura.")}`),
  },
  {
    key: "acesso_portal",
    name: "Acesso ao portal",
    subject: "Seu acesso ao portal Nativos",
    category: "acesso",
    allowed_variables: ["nome", "portal", "login", "link", "validade", "whatsapp"],
    body: shell(`${title("Boas-vindas ao portal Nativos")} ${text("Olá, {{nome}}. É um prazer ter você conosco. Seu acesso ao {{portal}} foi criado e está pronto para ativação.")} ${card("Usuário de acesso", "{{login}}")}${card("Validade do link", "{{validade}}")} ${sectionTitle("Como acessar")} ${instructions(["Clique em “Ativar meu acesso” abaixo.", "Crie uma senha pessoal e segura.", "Conclua a ativação e entre novamente pelo link individual do seu portal.", "Mantenha seus dados de acesso sob sua responsabilidade."])} ${note("A Nativos nunca solicitará sua senha por e-mail ou WhatsApp. Se você não reconhece este cadastro, avise nossa equipe e não utilize o link.")}<div style="margin-top:22px">${button("Ativar meu acesso")}</div>${signoff("Se precisar de ajuda no primeiro acesso, nossa equipe está à disposição.")}`),
  },
  {
    key: "voucher_cliente",
    name: "Voucher da reserva",
    subject: "Seu voucher · {{codigo_reserva}}",
    category: "documentos",
    allowed_variables: ["nome", "codigo_reserva", "data_servico", "horario", "origem", "destino", "ponto_encontro", "anexo_nome", "link", "whatsapp"],
    body: shell(`${title("Sua experiência está confirmada")} ${text("Olá, {{nome}}. Agradecemos por escolher a Nativos Experiences. Seu voucher segue anexo e reúne as informações confirmadas do atendimento.")} ${card("Reserva", "{{codigo_reserva}}")}${card("Data e horário", "{{data_servico}} · {{horario}}")}${card("Embarque", "{{origem}}")}${card("Destino", "{{destino}}")} ${sectionTitle("Orientações para o embarque")} ${instructions(["Confira no voucher nomes, data, horário, locais e quantidade de passageiros.", "Esteja no ponto de encontro no horário combinado e mantenha o telefone informado disponível.", "No aeroporto, procure nossa equipe com a plaquinha de identificação no local indicado.", "Informe previamente qualquer alteração de voo, bagagem, passageiro ou hospedagem.", "Caso não localize o motorista, entre em contato conosco antes de contratar outro transporte."])} ${note("Ponto de encontro: {{ponto_encontro}}. Em chegadas aéreas, oferecemos até 20 minutos de espera gratuita após o desembarque. Condições diferentes constarão no voucher.")}<div style="margin-top:18px;padding:13px 14px;background:#f4efe3;border-radius:8px;color:#6d5a35;font-size:13px">Documento anexado: {{anexo_nome}}</div>${signoff("Será um prazer receber você e cuidar do seu deslocamento em Trancoso e região.")}`),
  },
  {
    key: "cobranca_parceiro",
    name: "Cobrança para parceiro",
    subject: "Pendência financeira · {{codigo_reserva}}",
    category: "financeiro",
    allowed_variables: ["nome", "codigo_reserva", "valor", "vencimento", "forma_pagamento", "favorecido", "chave_pagamento", "link", "whatsapp"],
    body: shell(`${title("Pendência financeira da reserva")} ${text("Olá, {{nome}}. Esperamos que esteja bem. Identificamos um valor pendente sob responsabilidade da sua empresa relacionado à reserva abaixo.")} ${card("Reserva", "{{codigo_reserva}}")}${card("Valor pendente", "{{valor}}")}${card("Vencimento", "{{vencimento}}")}${card("Forma de pagamento", "{{forma_pagamento}}")} ${sectionTitle("Instruções para pagamento")} ${instructions(["Realize o pagamento utilizando apenas os dados confirmados neste e-mail ou no portal do parceiro.", "Confira o nome do favorecido antes de concluir a transação: {{favorecido}}.", "Identificação para pagamento: {{chave_pagamento}}.", "Após o pagamento, anexe o comprovante no portal para identificação e baixa financeira."])} ${note("Esta comunicação é dirigida ao parceiro responsável. Nenhuma cobrança é enviada por e-mail ao passageiro.")}<div style="margin-top:22px">${button("Ver cobrança no portal")}</div>${signoff("Caso o pagamento já tenha sido realizado, envie o comprovante para nossa conferência.")}`),
  },
  {
    key: "fatura_fechada",
    name: "Fatura fechada",
    subject: "Fatura fechada · {{competencia}}",
    category: "financeiro",
    allowed_variables: ["nome", "competencia", "quantidade_reservas", "valor", "vencimento", "favorecido", "chave_pagamento", "anexo_nome", "link", "whatsapp"],
    body: shell(`${title("Sua fatura foi fechada")} ${text("Olá, {{nome}}. Agradecemos pela parceria. Concluímos o fechamento da competência {{competencia}} e a fatura está disponível para conferência e pagamento.")} ${card("Reservas incluídas", "{{quantidade_reservas}}")}${card("Valor total", "{{valor}}")}${card("Vencimento", "{{vencimento}}")} ${sectionTitle("Conferência e pagamento")} ${instructions(["Confira no demonstrativo todas as reservas incluídas no período.", "Se identificar alguma divergência, avise nossa equipe antes do vencimento.", "Efetue o pagamento para {{favorecido}}, utilizando {{chave_pagamento}}.", "Anexe o comprovante no portal para que a baixa seja feita de forma segura e rastreável."])}<div style="margin-top:18px;padding:13px 14px;background:#f4efe3;border-radius:8px;color:#6d5a35;font-size:13px">Fatura anexada: {{anexo_nome}}</div><div style="margin-top:22px">${button("Conferir fatura no portal")}</div>${signoff("Obrigado pela confiança e pela continuidade da nossa parceria.")}`),
  },
  {
    key: "pagamento_confirmado",
    name: "Pagamento confirmado para parceiro ou fornecedor",
    subject: "Pagamento confirmado · {{codigo_reserva}}",
    category: "financeiro",
    allowed_variables: ["nome", "codigo_reserva", "valor", "data_pagamento", "forma_pagamento", "anexo_nome", "whatsapp"],
    body: shell(`${title("Pagamento confirmado")} ${text("Olá, {{nome}}. O pagamento relacionado à operação abaixo foi identificado e confirmado com sucesso.")} ${card("Reserva", "{{codigo_reserva}}")}${card("Valor confirmado", "{{valor}}")}${card("Data do pagamento", "{{data_pagamento}}")}${card("Forma de pagamento", "{{forma_pagamento}}")} ${note("Nenhuma nova ação é necessária. O registro permanece disponível no extrato do portal e vinculado à reserva.")}<div style="margin-top:18px;padding:13px 14px;background:#edf5ef;border-radius:8px;color:#356244;font-size:13px">Comprovante identificado: {{anexo_nome}}</div>${signoff("Agradecemos pela parceria com a Nativos Experiences.")}`),
  },
  {
    key: "documento_disponivel",
    name: "Documento disponível",
    subject: "Documento disponível · {{codigo_reserva}}",
    category: "documentos",
    allowed_variables: ["nome", "codigo_reserva", "tipo_documento", "orientacao_documento", "anexo_nome", "link", "whatsapp"],
    body: shell(`${title("Documento disponível")} ${text("Olá, {{nome}}. O documento referente à reserva {{codigo_reserva}} está pronto e segue anexado a esta mensagem.")} ${card("Documento", "{{tipo_documento}")} ${sectionTitle("Antes de utilizar")} ${instructions(["Confira se os dados da reserva e das pessoas envolvidas estão corretos.", "Siga a orientação específica deste documento: {{orientacao_documento}}.", "Utilize sempre a versão mais recente disponível no portal.", "Se precisar de correção, solicite antes do início do serviço."])}<div style="margin-top:18px;padding:13px 14px;background:#f4efe3;border-radius:8px;color:#6d5a35;font-size:13px">Documento anexado: {{anexo_nome}}</div><div style="margin-top:22px">${button("Abrir documento no portal")}</div>${signoff("Se houver qualquer dúvida sobre o documento, nossa equipe está pronta para ajudar.")}`),
  },
];

export const EMAIL_PREVIEW_VARIABLES: Record<string, string> = {
  nome: "Mariana Almeida",
  codigo_reserva: "NAT-2026-0148",
  data_servico: "18/09/2026",
  horario: "14:30",
  origem: "Aeroporto de Porto Seguro",
  destino: "Trancoso",
  categoria: "Executiva",
  portal: "Portal do Parceiro",
  validade: "24 horas",
  valor: "R$ 1.280,00",
  vencimento: "25/09/2026",
  forma_pagamento: "PIX",
  data_pagamento: "15/09/2026",
  competencia: "setembro/2026",
  anexo_nome: "voucher-NAT-2026-0148.pdf",
  tipo_documento: "Voucher da reserva",
  login: "mariana@empresa.com.br",
  ponto_encontro: "Área de desembarque, próximo à saída principal",
  favorecido: "Nativos Experiences Ltda.",
  chave_pagamento: "PIX CNPJ 22.891.018/0001-63",
  quantidade_reservas: "6 serviços",
  orientacao_documento: "apresente ao responsável pela operação antes do embarque",
  whatsapp: "5573999999999",
  link: "#",
};
