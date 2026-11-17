import { siteBlogHistory } from './site-current-blog-history';

export type SiteDefaultContent =
  Record<string, unknown>;

const historiasPessoas = [
  {
    nome: 'David Mendes',
    cargo: 'Supervisor de Registro',
    texto:
      'A Pizzattolog é uma empresa que valoriza as pessoas e oferece oportunidades reais de crescimento.',
  },
  {
    nome: 'Rodrigo Aliaga',
    cargo: 'Assistente de Retropátio',
    texto:
      'O que mais gosto de trabalhar na Pizzattolog é a união da equipe e o bom ambiente de trabalho, onde todos se ajudam.',
  },
  {
    nome: 'Rafael do Amaral',
    cargo: 'Analista de CCO',
    texto:
      'A Pizzattolog é uma empresa que valoriza as pessoas e oferece oportunidades de desenvolvimento. Aqui consegui evoluir profissionalmente, construir minha vida e cuidar da minha família.',
  },
  {
    nome: 'Isabella Costa',
    cargo: 'Assistente de Marketing',
    texto:
      'Comecei minha trajetória na Pizzattolog como Jovem Aprendiz, onde tive a oportunidade de crescer e desenvolver minhas habilidades profissionais. Com dedicação e muito aprendizado ao longo do caminho, conquistei novas oportunidades dentro da empresa.',
  },
  {
    nome: 'Renata Zachi',
    cargo: 'Motorista',
    texto:
      'É uma alegria poder participar e fazer parte de uma empresa que me recebeu desde o começo com muita alegria, com muito carinho. Todas as pessoas, desde o início, me receberam bem e me ensinaram tudo o que sabem.',
  },
];

const unidades = [
  {
    nome: 'Curitiba - PR (Matriz)',
    endereco:
      'Rua Nunes Machado, 68 - 15º andar, Batel, 80250-000.',
  },
  {
    nome: 'Filial Curitiba - PR',
    endereco:
      'Rua Frei Gaspar da Madre de Deus, 830 - Prédio 26, Portão, 81050-590.',
  },
  {
    nome: 'Filial São José dos Pinhais - PR',
    endereco:
      'Rua do Colono, 2146 - Costeira, 83075-000.',
  },
  {
    nome: 'Filial Rodeio - SC',
    endereco:
      'Rua Jose Ostrowski Junior, 623 - Kaspereit, 89136-000.',
  },
  {
    nome: 'Filial Guarulhos - SP',
    endereco:
      'Estrada Velha, 100 - Cumbica, 07231-010.',
  },
  {
    nome: 'Filial Varginha - MG',
    endereco:
      'Avenida Princesa do Sul, 950 - Jardim Andere, 37.026-080.',
  },
  {
    nome: 'Filial Feira de Santana - BA',
    endereco:
      'Avenida Deputado Luís Eduardo Magalhães - Limoeiro, 44.097-324.',
  },
  {
    nome: 'Filial Parnamirim - RN',
    endereco:
      'Rua Piloto Pereira Tim, 1762 - Monte Claro, 59146-220.',
  },
];

export const siteCurrentContent: Record<string, SiteDefaultContent> = {
  home: {
    hero: {
      etiqueta: 'Vamos juntos movimentar o mundo',
      titulo: 'A trilha de Sucesso da Pizzattolog',
      descricao:
        'Nós cuidamos da logística de ponta a ponta, dedicados a atender exclusivamente outras empresas (B2B). Nossa especialidade é fazer com que tudo chegue ao seu destino no tempo certo e com segurança.',
      imagemUrl: '/images/home/caminhao-tela-inicial.png',
      textoBotaoPrimario: 'Falar com especialista',
      textoBotaoSecundario: 'Ver soluções',
    },
    solucoes: [
      {
        titulo: 'Armazenagem',
        descricao:
          'Conte com o nosso cuidado e segurança para a armazenagem de seus produtos. Entregamos gestão inteligente de estoque, infraestrutura moderna e processos otimizados que garantem a redução de custos e a conexão ágil com o transporte, para que sua operação logística permaneça eficiente e sempre em movimento.',
      },
      {
        titulo: 'Operador logístico',
        descricao:
          'Os operadores da Pizzattolog estão sempre preparados para organizar e aprimorar a execução de cada etapa. Com precisão e agilidade, garantimos a otimização dos processos internos e externos. O resultado é a segurança total da sua carga, o máximo grau de previsibilidade e o respeito aos prazos da sua logística.',
      },
      {
        titulo: 'Transporte de cargas',
        descricao:
          'Somos especialistas em transporte de cargas para outras empresas (B2B) por estrada, com o foco total no sucesso do seu negócio. Conte com a nossa experiência para levar sua carga com segurança, o que garante o máximo grau de previsibilidade nas entregas e a eficiência em todas as operações.',
      },
    ],
  },

  'quem-somos': {
    banner: {
      titulo: '',
      subtitulo: '',
      imagemUrl: '/images/quem somos/quem-somos-banner.png',
    },
    historia: {
      titulo: 'Sobre nós',
      texto:
        'Na Pizzattolog, reunimos a solidez de mais de 50 anos de história com uma visão clara de futuro. Somos uma Seleção de profissionais da logística, movidos pelo compromisso com a excelência, pela responsabilidade em cada decisão e pela busca constante por evoluir pessoas, processos e tecnologias.\n\nEntregamos soluções logísticas completas e integradas em todas as etapas da cadeia de suprimentos, atuando de ponta a ponta para simplificar operações complexas, gerar previsibilidade e garantir eficiência operacional real. Somos movidos por desafios e pela convicção de que a inovação só faz sentido quando transforma tecnologia em confiança, qualidade e resultado para nossos clientes.\n\nCom unidades estrategicamente localizadas e ampla atuação, desenvolvemos soluções sob medida para transportes de carga e operações logísticas de alta complexidade, mantendo a consistência de quem conhece o caminho e a determinação de quem constrói, todos os dias, o futuro da logística.',
      imagemUrl: '/images/quem somos/historia-equipe.png',
    },
    missao: {
      titulo: 'Propósito',
      texto: 'Simplificar soluções para cuidar do que importa.',
    },
    visao: {
      titulo: 'Visão',
      texto:
        'Somos um parceiro estratégico, integramos soluções personalizadas, com geração de valor a clientes, colaboradores e sociedade.',
    },
    valoresResumo: {
      titulo: 'Valores',
      texto:
        'Influenciamos positivamente nossos colaboradores. Somos comprometidos com o sucesso do cliente. Criamos espaços para diálogo com respeito e humildade. Estimulamos a inovação simples.',
    },
    valores: [
      { titulo: 'Conformidade Legal', descricao: '' },
      { titulo: 'Foco no Cliente', descricao: '' },
      { titulo: 'Cultura de Segurança', descricao: '' },
      { titulo: 'Transparência', descricao: '' },
      { titulo: 'Sustentabilidade', descricao: '' },
      { titulo: 'Gestão de Riscos', descricao: '' },
      { titulo: 'Manutenção Preditiva', descricao: '' },
      { titulo: 'Melhoria contínua', descricao: '' },
    ],
    certificacoes: [
      {
        titulo: 'PLVB',
        descricao:
          'Programa de Logística Verde Brasil, reforçando nosso compromisso com práticas sustentáveis no transporte.',
      },
      {
        titulo: 'SASSMAQ',
        descricao:
          'Empresa aprovada no Sistema de Avaliação de Segurança, Saúde, Meio Ambiente e Qualidade para operações responsáveis.',
      },
      {
        titulo: 'Hospital Pequeno Príncipe',
        descricao:
          'Empresa apoiadora do Hospital Pequeno Príncipe, contribuindo com uma das principais instituições pediátricas do país.',
      },
      {
        titulo: 'Empresa B Certificada',
        descricao:
          'Certificação que reconhece empresas comprometidas com impacto social e ambiental positivo, ética e responsabilidade nos negócios.',
      },
    ],
    unidades: {
      etiqueta: 'Nossas unidades',
      titulo: 'Nossas Unidades',
      texto:
        'Confira nossas unidades estrategicamente localizadas para apoiar operações logísticas de alta complexidade em diferentes regiões do Brasil.',
    },
  },

  solucoes: {
    cabecalho: {
      etiqueta: 'Soluções',
      titulo: 'Soluções Completas e Integradas',
      descricao:
        'Nossa operação B2B transforma a complexidade logística em vantagem competitiva, assumindo a gestão total da sua cadeia de suprimentos. Do planejamento à entrega final, entregamos a previsibilidade que o seu negócio exige e a confiança que a sua marca merece.',
      imagemUrl: '/images/solucoes/solucoes-banner.png',
    },
    itens: [
      {
        titulo: 'Armazenagem',
        descricao:
          'Unimos infraestrutura moderna à inteligência logística para garantir que seu produto esteja disponível no lugar certo, na hora certa e com integridade absoluta.',
        pontos: [
          'Inbound & Outbound: Gestão completa do fluxo de entrada e saída.',
          'Cross-docking: Agilidade na redistribuição sem necessidade de estocagem longa.',
          'Gestão de Estoque Just-in-Time: Redução de custos e estoque zero.',
        ],
      },
      {
        titulo: 'Transporte de Cargas',
        descricao:
          'Especialista no atendimento B2B, a Pizzattolog oferece muito mais do que o deslocamento de cargas: entregamos previsibilidade e inteligência logística.',
        pontos: [
          'Carga Lotação (FTL): Transporte de carga completa, ideal para volumes elevados.',
          'Carga Fracionada (LTL): Consolidação de cargas, rastreabilidade e alto controle operacional.',
          'Importação e Exportação: Integração entre transporte, armazenagem e documentação.',
          'Distribuição Urbana e Regional: Gestão de rotas, janelas e eficiência no last mile.',
        ],
      },
      {
        titulo: 'Operador Logístico',
        descricao:
          'A Pizzattolog atua como um Operador Logístico 3PL, parceiro estratégico que assume a gestão completa da sua logística, da organização do estoque ao transporte final.',
        pontos: [
          'Gestão inteligente e integrada para previsibilidade total.',
          'Atuação dentro da sua estrutura ou em nossos centros de distribuição.',
          'Equipes qualificadas e processos rigorosos para operações de alta complexidade.',
        ],
      },
    ],
    cta: {
      titulo: 'Precisa de soluções logísticas eficientes?',
      descricao:
        'Fale com a Pizzattolog e encontre a estrutura certa para a sua operação.',
      botaoTexto: 'Solicitar cotação',
    },
    segmentosCabecalho: {
      titulo: 'Especialistas em logística B2B para operações reguladas.',
      descricao:
        'Somos especialistas em logística B2B para os segmentos de Químicos, Cosméticos e mercado Pet. Nossas soluções atendem empresas que buscam transportadora especializada em produtos regulados, com foco em segurança operacional, conformidade legal, licenças obrigatórias, previsibilidade nas entregas e gestão de riscos.',
    },
    segmentos: [
      { titulo: 'Cosméticos e Higiene Pessoal', descricao: '' },
      { titulo: 'Produtos Químicos', descricao: '' },
      { titulo: 'Higiene, Nutrição e Saúde Pets', descricao: '' },
    ],
    diferenciaisCabecalho: {
      titulo:
        'Diferenciais que conectam performance, segurança e estratégia.',
      descricao: '',
    },
    diferenciais: [
      {
        titulo: 'Logística Integrada',
        texto:
          'Sua operação conectada de ponta a ponta. Com processos inteligentes e comunicação ativa, entregamos fluidez, previsibilidade e alinhamento total com a estratégia do cliente.',
      },
      {
        titulo: 'Inteligência de Dados',
        texto:
          'Informações em tempo real. Consolidamos sistemas de alta tecnologia, rastreamento e dashboards inteligentes para assegurar visibilidade estratégica, agilidade e segurança às suas operações.',
      },
      {
        titulo: 'Parceria Estratégica',
        texto:
          'Logística desenhada para o seu negócio. Além de seu transportador, somos o seu parceiro estratégico. Criamos soluções sob medida para entender, prever e resolver as complexidades da sua cadeia logística.',
      },
      {
        titulo: 'Segurança Operacional',
        texto:
          'A carga é sua, o cuidado é nosso. Operamos com frota monitorada e protocolos rigorosos para garantir a preservação da sua carga, a segurança viária e a excelência em cada rota.',
      },
      {
        titulo: 'ESG',
        texto:
          'Compromisso com o futuro. Através de governança ética, inclusão e projetos contínuos, avançamos na construção de uma logística consciente que agrega valor real aos parceiros.',
      },
      {
        titulo: 'Eficiência',
        texto:
          'Menos desperdício, mais performance. Aplicamos a filosofia Lean Thinking para otimizar fluxos e eliminar desperdícios, garantindo máxima produtividade e uma logística ágil focada no que gera valor real.',
      },
    ],
    numeros: [
      { valor: '+50', rotulo: 'Anos de História' },
      { valor: '+740', rotulo: 'ativos' },
      { valor: '+850', rotulo: 'colaboradores' },
      { valor: '+490 mil', rotulo: 'toneladas / ano' },
    ],
    agregados: {
      etiqueta: 'Agregados',
      titulo:
        'Venha ser agregado e conheça o Clube de Benefícios exclusivos.',
      descricao: '',
      imagemUrl:
        'https://pizzattolog.com.br/wp-content/uploads/2026/03/bannerrrrr-AGREGADOS-e1776274417156.png',
      botaoTexto: 'Saiba mais',
    },
    insightsCabecalho: {
      titulo: 'Insights & Tendências',
      descricao:
        'Conheça as últimas tendências em logística, transformação digital e gestão estratégica que impulsionam o sucesso dos nossos clientes.',
    },
    insights: [
      {
        titulo: 'O guia definitivo do piso mínimo de frete da ANTT',
        resumo: '',
      },
      {
        titulo:
          'Logística de alta densidade: A ciência por trás das carretas Double-Deck e a sua eficiência',
        resumo: '',
      },
      {
        titulo:
          'Caminhos que transformam: a nossa parceria com o Hospital Pequeno Príncipe',
        resumo: '',
      },
    ],
  },

  'especialidades-logisticas': {
    hero: {
      etiqueta: '/especialidades-logisticas/',
      titulo: 'Especialidades Logísticas',
      descricao:
        'Logística especializada para segmentos que exigem segurança, conformidade, cuidado operacional e previsibilidade em cada entrega.',
    },
    especialidades: [
      {
        etiqueta: 'Operações reguladas',
        titulo: 'Produtos Químicos',
        descricao:
          'Atendemos operações logísticas para produtos químicos com foco em segurança, conformidade documental, rastreabilidade e processos controlados. Nossa estrutura foi desenhada para empresas que exigem cuidado técnico, previsibilidade e gestão de risco em toda a cadeia.',
        pontos: [
          'Processos com foco em segurança operacional',
          'Atenção a licenças, normas e documentação',
          'Rastreabilidade e controle em cada etapa',
        ],
      },
      {
        etiqueta: 'Cuidado com a marca',
        titulo: 'Cosméticos e Higiene',
        descricao:
          'Soluções logísticas para cosméticos e higiene pessoal, preservando integridade, apresentação e prazo de entrega. Atuamos para manter a experiência do cliente final alinhada ao padrão de qualidade da sua marca.',
        pontos: [
          'Controle no manuseio e movimentação',
          'Agilidade para demandas sazonais',
          'Distribuição alinhada ao varejo e indústria',
        ],
      },
      {
        etiqueta: 'Mercado pet',
        titulo: 'Saúde e Nutrição Pet',
        descricao:
          'Atendemos empresas do mercado pet com soluções para produtos de saúde, nutrição e bem-estar animal. Nossa operação combina cuidado no transporte, previsibilidade e capacidade para apoiar cadeias com alto volume e exigência de qualidade.',
        pontos: [
          'Operação preparada para produtos sensíveis',
          'Previsibilidade para abastecimento recorrente',
          'Suporte logístico para crescimento do segmento pet',
        ],
      },
    ],
  },

  social: {
    hero: {
      etiqueta: '/social/',
      titulo: 'Social',
      descricao:
        'Iniciativas, programas e histórias que fortalecem nossa cultura, reconhecem pessoas e ampliam impacto positivo dentro e fora da operação.',
      imagemUrl: '/images/programas/logo Entre Rotas.png',
    },
    iniciativasCabecalho: {
      titulo: '',
      descricao: '',
    },
    iniciativas: [
      {
        etiqueta: 'Conteúdo e conexão',
        titulo: 'Entre Rotas',
        descricao:
          'Um espaço para compartilhar histórias, aprendizados e conteúdos que aproximam pessoas da rotina da logística. O Entre Rotas valoriza quem constrói nossa operação todos os dias.',
      },
      {
        etiqueta: 'Sustentabilidade',
        titulo: 'Rota Verde',
        descricao:
          'O Rota Verde é nossa operação de carga fracionada conduzida exclusivamente por mulheres ao volante de veículos 100% elétricos em Curitiba e região. Unimos a meta de zero emissões ao protagonismo feminino, transformando a logística urbana em um modelo de impacto positivo.',
      },
      {
        etiqueta: 'Capacitação',
        titulo: 'Rota do Saber',
        descricao:
          'O Rota do Saber promove a capacitação contínua de nossas equipes, unindo o desenvolvimento pessoal e profissional a uma cultura de segurança viária. Assim, garantimos que nossos profissionais estejam sempre preparados para os desafios e as transformações da logística moderna.',
      },
      {
        etiqueta: 'Reconhecimento',
        titulo: 'Rota de Oportunidade',
        descricao:
          'O Rota de Oportunidade é o nosso canal direto com você: através de QR Codes adesivados em nossos caminhões, abrimos espaço para feedbacks sobre nossa frota e atuação nas estradas. Esse reconhecimento é a base de premiações trimestrais e do nosso grande destaque anual, onde os motoristas com melhor desempenho e avaliação são premiados pela integridade e qualidade mantidas em cada viagem.',
      },
      {
        etiqueta: 'Cultura',
        titulo: 'Diversidade e Inclusão',
        descricao:
          'Valorizar e integrar as diferenças é o que fortalece a nossa equipe. No programa Diversidade e Inclusão, garantimos um ambiente seguro onde diferentes vivências e habilidades são reconhecidas. Nosso compromisso é construir uma operação onde o respeito e a multiplicidade de talentos caminhem juntos para resolver desafios com excelência.',
      },
    ],
    historiasCabecalho: {
      titulo: 'Pessoas que constroem nossa história',
      descricao:
        'Histórias reais de colaboradores, motoristas e parceiros que mostram como a logística transforma trajetórias e conecta oportunidades.',
    },
    historias: historiasPessoas,
  },

  carreiras: {
    hero: {
      etiqueta: 'Sua Carreira Pizzattolog',
      titulo: 'Sua carreira Pizzattolog',
      descricao:
        'O sucesso da Pizzattolog só acontece por causa de quem vive a nossa logística todos os dias. Aqui, acreditamos em um ambiente de respeito mútuo, onde o trabalho bem feito se transforma em oportunidades práticas de crescimento. Buscamos profissionais comprometidos com a realidade do setor logístico e que desejam construir carreiras sólidas ao nosso lado.',
      imagemUrl: '/images/carreira/carreiras-banner.png',
    },
    destaques: [
      { texto: 'Respeito mútuo' },
      { texto: 'Crescimento real' },
      { texto: 'Time colaborativo' },
    ],
    historias: historiasPessoas,
    programas: [
      {
        titulo: 'Rota de Oportunidade',
        texto:
          'Na Pizzattolog, acreditamos que quem move nossas operações também merece reconhecimento. Por isso, criamos o Rota de Oportunidade, um programa de incentivo desenvolvido para valorizar o desempenho e o comprometimento dos nossos motoristas.',
        imagem: '/images/carreira/rotadeoportunidade.png',
      },
      {
        titulo: 'Café com RH',
        texto:
          'Um espaço aberto de diálogo, troca e conexão. O Café com RH aproxima colaboradores e liderança, promove conversas construtivas e fortalece nossa cultura organizacional. É onde ouvimos, orientamos e desenvolvemos juntos.',
        imagem: '/images/carreira/cafecomrh.png',
      },
      {
        titulo: 'Rota do Saber',
        texto:
          'Nosso programa de desenvolvimento contínuo. Através de treinamentos, encontros estratégicos e capacitações práticas, promovemos o aprimoramento técnico e comportamental dos colaboradores. Aqui, aprender faz parte da rotina e evoluir é compromisso.',
        imagem: '/images/carreira/rotadosaber.png',
      },
    ],
    cta: {
      titulo: 'Quer trabalhar na Pizzattolog?',
      descricao:
        'Se você busca crescimento profissional, desenvolvimento contínuo e quer fazer parte de uma equipe que valoriza pessoas, essa é a sua oportunidade.',
      botaoTexto: 'Ver vagas',
    },
  },

  agregados: {
    banner: {
      imagemUrl: '/images/agregados-topo.png',
    },
    intro: {
      titulo: 'Venha ser agregado Pizzattolog',
      texto:
        'Faça parte de uma operação sólida, com fluxo de cargas, benefícios exclusivos e apoio para manter sua produtividade na estrada.',
      botaoTexto: 'Quero ser agregado',
      imagemUrl: '/images/agregados/agregados-frota.png',
    },
    oQueE: {
      titulo: 'O que é ser um agregado',
      texto:
        'Ser agregado Pizzattolog é trabalhar conectado a uma estrutura logística que valoriza parceria, segurança, transparência e relacionamento de longo prazo.',
      imagemUrl: '/images/agregados/agregados-motorista.png',
    },
    vantagens: [
      { titulo: 'Cartão de abastecimento', descricao: '' },
      { titulo: 'Carretas revisadas', descricao: '' },
      {
        titulo: 'Seguro contra terceiros com preço diferenciado',
        descricao: '',
      },
      { titulo: 'Transparência nas negociações', descricao: '' },
      { titulo: 'Rastreador em comodato', descricao: '' },
      {
        titulo: 'Fluxo de cargas com sinergia o ano todo',
        descricao: '',
      },
      { titulo: 'Clube exclusivo de benefícios', descricao: '' },
      {
        titulo: 'Bonificação para segurança e produtividade',
        descricao: '',
      },
    ],
    beneficiosClube: [
      {
        titulo:
          'Indicação com valores acessíveis para inspeção veicular',
        descricao: '',
      },
      {
        titulo:
          'Bonificação do motorista com atualização variável de acordo com performance',
        descricao: '',
      },
      {
        titulo: 'Material de apoio para educação financeira',
        descricao: '',
      },
      {
        titulo:
          'Indicação de clínica com melhor preço para Exame Toxicológico',
        descricao: '',
      },
      {
        titulo:
          'Material de apoio com dicas de saúde e qualidade de vida',
        descricao: '',
      },
      {
        titulo: 'Bonificação por tempo de agregamento',
        descricao: '',
      },
      {
        titulo: 'Pneus com preços e condições especiais',
        descricao: '',
      },
      { titulo: 'Indique e ganhe bônus', descricao: '' },
      {
        titulo:
          'Indicação dos melhores locais para manutenção preventiva (sistema lubrificação / rodante)',
        descricao: '',
      },
      {
        titulo:
          'Diesel e Arla com indicação de melhores preços nos postos homologados',
        descricao: '',
      },
    ],
    requisitos: {
      titulo: 'Requisitos',
      veiculo: [
        'Cavalos 4x2/6x2 frontal',
        'Idade máxima de 10 anos para veículos acima de 2016',
        'Manutenção em dia',
        'Documentação em dia',
      ],
      motorista: [
        'CNH categoria E',
        'Motorista com experiência',
        'MOPP',
        'EAR',
        'ASO',
        'Exame toxicológico',
        'Perfil securitário',
      ],
    },
    unidades,
    cta: {
      titulo: 'Pronto para ser agregado?',
      descricao:
        'Entre em contato com a Pizzattolog e conheça as oportunidades para motoristas agregados.',
      botaoTexto: 'Quero ser agregado',
    },
  },

  esg: {
    compromisso: {
      etiqueta: 'ESG',
      titulo: 'Nosso Compromisso ESG',
      descricao:
        'Transportar com responsabilidade define a trajetória da Pizzattolog há cinco décadas.',
      imagemUrl: '/images/esg/banner-esg.jpeg',
    },
    empresaB: {
      titulo: 'Empresa B Certificada',
      texto:
        'Somos uma Empresa B. Isso significa que nossa operação é rigorosamente auditada por padrões internacionais, garantindo que o lucro caminhe lado a lado com o impacto social positivo, a ética nos negócios e a eficiência ambiental.',
      botaoTexto: 'Conheça nossa certificação',
    },
    ambiental: {
      titulo: 'Ambiental',
      texto:
        'Iniciativas voltadas à redução de impactos ambientais, uso consciente de recursos e evolução constante da operação.',
      imagemUrl: '/images/esg/banner-esg.jpeg',
    },
    social: {
      titulo: 'Social',
      texto:
        'Programas que valorizam pessoas, promovem desenvolvimento e ampliam impacto positivo dentro e fora da operação.',
      imagemUrl: '/images/esg/banner-esg.jpeg',
    },
    programasCabecalho: {
      titulo: 'Programas internos',
      descricao:
        'Iniciativas que reforçam cultura, capacitação, reconhecimento, diversidade e sustentabilidade.',
    },
    programas: [
      {
        titulo: 'Rota Verde',
        descricao:
          'O Rota Verde é nossa operação de carga fracionada conduzida exclusivamente por mulheres ao volante de veículos 100% elétricos em Curitiba e região. Unimos a meta de zero emissões ao protagonismo feminino, transformando a logística urbana em um modelo de impacto positivo.',
      },
      {
        titulo: 'Rota do Saber',
        descricao:
          'O Rota do Saber promove a capacitação contínua de nossas equipes, unindo o desenvolvimento pessoal e profissional a uma cultura de segurança viária.',
      },
      {
        titulo: 'Rota de Oportunidade',
        descricao:
          'O Rota de Oportunidade é o nosso canal direto com você: através de QR Codes adesivados em nossos caminhões, abrimos espaço para feedbacks sobre nossa frota e atuação nas estradas.',
      },
      {
        titulo: 'Diversidade e Inclusão',
        descricao:
          'Valorizar e integrar as diferenças é o que fortalece a nossa equipe.',
      },
    ],
    governanca: {
      titulo: 'Governança Corporativa',
      texto:
        'Governança transparente, ética nos negócios e responsabilidade em cada decisão orientam nossa forma de operar.',
      imagemUrl: '/images/esg/banner-esg.jpeg',
    },
    relatorio: {
      etiqueta: 'Relatório ESG',
      titulo: 'Relatório ESG',
      texto:
        'Acompanhe nossos compromissos, indicadores e evolução nas frentes ambiental, social e de governança.',
      botaoTexto: 'Acessar relatório',
    },
  },

  seminovos: {
    hero: {
      etiqueta: 'Seminovos Pizzattolog',
      titulo: 'Seminovos com qualidade certificada',
      descricao:
        'Caminhões preparados para colocar sua operação em movimento com confiança, procedência e segurança.',
      botaoTexto: 'Encontrar meu seminovo',
      imagemUrl: '/images/seminovos/caminhao.png',
    },
    introducao: {
      etiqueta: 'Qualidade certificada',
      titulo:
        'Seminovo é sinônimo de cuidado, confiança e investimento inteligente.',
      texto:
        'Cada veículo passa por uma avaliação criteriosa para entregar mais segurança na compra e mais previsibilidade na operação.',
      imagemUrl: '/images/seminovos/seminovos.png',
    },
    introducaoPilares: [
      {
        titulo: 'Procedência conferida',
        texto:
          'Histórico, quilometragem e documentação avaliados antes da negociação.',
      },
      {
        titulo: 'Frota preparada',
        texto:
          'Veículos revisados para voltar à operação com segurança e previsibilidade.',
      },
      {
        titulo: 'Escolha orientada',
        texto:
          'Apoio consultivo para encontrar o caminhão certo para a sua necessidade.',
      },
    ],
    beneficios: [
      {
        titulo: 'Transparência total',
        descricao:
          'Cada seminovo Pizzattolog vem com histórico, revisões e quilometragem documentados, garantindo procedência clara.',
      },
      {
        titulo: 'Manutenção em dia',
        descricao:
          'Todos os veículos passam por checagem completa feita por especialistas e são entregues prontos para rodar.',
      },
      {
        titulo: 'Segurança garantida',
        descricao:
          'Frota preparada para oferecer desempenho com segurança e reduzir riscos de paradas inesperadas.',
      },
      {
        titulo: 'Pronto para crescer',
        descricao:
          'Regularizados e liberados para uso imediato: compre hoje e coloque seu veículo em operação.',
      },
    ],
    diferenciais: [
      {
        titulo: 'Documentação 100% regularizada',
        descricao:
          'Sem burocracia: caminhões com documentação em dia e preparados para rodar com segurança.',
      },
      {
        titulo: 'Check-up completo antes da entrega',
        descricao:
          'Os veículos passam por inspeção técnica rigorosa, proporcionando maior confiabilidade desde o primeiro dia.',
      },
      {
        titulo: 'Modelos multimarcas à sua disposição',
        descricao:
          'Diversas marcas e modelos para você escolher o caminhão mais adequado à sua operação.',
      },
      {
        titulo: 'Suporte consultivo na escolha',
        descricao:
          'Uma equipe especializada ajuda você a encontrar o veículo mais adequado às necessidades da sua frota.',
      },
      {
        titulo: 'A confiança de quem entende de logística',
        descricao:
          'Experiência no setor para oferecer não apenas veículos, mas segurança para o seu investimento.',
      },
    ],
    depoimentos: [
      {
        nome: 'Carlos M.',
        cargo: 'Transportador Autônomo',
        texto:
          'Quando precisei ampliar minha frota, encontrei na Pizzattolog não só caminhões em excelente estado, mas também orientação para escolher o modelo mais adequado. Hoje, minha operação roda com menos paradas e muito mais eficiência.',
      },
      {
        nome: 'Logística Rápida SP',
        cargo: 'Empresa de transportes',
        texto:
          'A procedência transparente fez toda a diferença na nossa decisão. O histórico detalhado nos deu segurança para investir e, desde então, os caminhões têm sido fundamentais para aumentar nossa produtividade.',
      },
      {
        nome: 'Fernanda S.',
        cargo: 'Empresária do Setor de Transportes',
        texto:
          'Na Pizzattolog percebi que seminovo não é apenas um veículo usado, mas sim uma solução pronta para rodar. Foi o melhor investimento para o meu negócio.',
      },
    ],
    faq: [
      {
        pergunta: 'Os caminhões seminovos da Pizzattolog têm garantia?',
        resposta:
          'As condições de garantia podem variar de acordo com o veículo. Nossa equipe apresenta todas as informações e condições antes da negociação.',
      },
      {
        pergunta: 'Posso financiar a compra do caminhão?',
        resposta:
          'As possibilidades de financiamento podem ser avaliadas durante a negociação. Entre em contato com nossa equipe comercial para conhecer as opções disponíveis.',
      },
      {
        pergunta: 'Vocês trabalham apenas com uma marca de caminhão?',
        resposta:
          'Não. Nossa disponibilidade pode incluir veículos de diferentes marcas, modelos e configurações.',
      },
      {
        pergunta:
          'Qual é a diferença entre comprar um seminovo comum e um seminovo Pizzattolog?',
        resposta:
          'O processo Pizzattolog busca oferecer maior transparência sobre procedência, documentação e condições do veículo antes da negociação.',
      },
      {
        pergunta: 'Os veículos estão prontos para rodar imediatamente?',
        resposta:
          'A condição de cada veículo é informada individualmente. Nossa equipe apresenta a documentação e as informações necessárias antes da entrega.',
      },
    ],
    cta: {
      titulo: 'Na estrada, o tempo não para.',
      descricao:
        'Seu próximo caminhão pode estar pronto para colocar sua operação em movimento. Encontre o seminovo ideal para o seu negócio.',
      botaoTexto: 'Falar com nossa equipe',
    },
  },

  'solicitar-cotacao': {
    hero: {
      etiqueta: 'Solicitar cotação',
      titulo: 'Solicite sua cotação',
      descricao:
        'Conte um pouco sobre a sua operação. Nossa equipe comercial analisará as informações e entrará em contato com você.',
    },
    apoio: {
      titulo: 'Solicite sua cotação',
      texto:
        'Preencha as informações da sua operação para que a equipe comercial da Pizzattolog possa avaliar a melhor solução logística.',
    },
  },

  contatos: {
    hero: {
      etiqueta: 'Contato',
      titulo: 'Fale conosco',
      descricao:
        'Escolha a área de interesse e nos envie uma mensagem.',
    },
    areasContato: [
      { titulo: 'Solicite uma cotação', descricao: '' },
      { titulo: 'Seja um agregado', descricao: '' },
      { titulo: 'Seja um fornecedor', descricao: '' },
      { titulo: 'Frota e Manutenção', descricao: '' },
      { titulo: 'Marketing e Comunicação', descricao: '' },
      { titulo: 'Financeiro', descricao: '' },
      { titulo: 'Jurídico', descricao: '' },
      { titulo: 'Fiscal', descricao: '' },
    ],
    canaisAtendimento: [
      {
        titulo: 'Canal de ouvidoria',
        texto:
          'Envie situações de forma anônima e segura, com confidencialidade em todo o registro.',
      },
      {
        titulo: 'Agregados',
        texto:
          'Conheça o clube de benefícios para motoristas agregados e acompanhe as oportunidades.',
      },
      {
        titulo: 'Lei Geral de Proteção de Dados',
        texto:
          'Acesse nossas informações sobre transparência no tratamento de dados pessoais.',
      },
    ],
    opcoesComunicacao: [
      { titulo: 'Elogio', descricao: '' },
      { titulo: 'Reclamação', descricao: '' },
      { titulo: 'Sugestão', descricao: '' },
      { titulo: 'Outro assunto', descricao: '' },
    ],
    unidades: {
      titulo: 'Onde estamos',
      descricao:
        'Encontre a unidade Pizzattolog mais próxima e veja os endereços que apoiam nossas operações pelo Brasil.',
    },
  },

  blog: {
    posts: siteBlogHistory,
  },

  'lei-geral-de-protecao-de-dados': {
    titulo: 'Lei Geral de Proteção de Dados',
    resumo:
      'Entenda como a Pizzattolog trata dados pessoais e quais direitos podem ser exercidos pelos titulares.',
    secoes: [
      {
        titulo: 'Compromisso com a proteção de dados',
        paragrafos: [
          'A Pizzattolog trata dados pessoais com responsabilidade, transparência e segurança, observando a Lei Geral de Proteção de Dados Pessoais (Lei nº 13.709/2018) e demais normas aplicáveis.',
          'Esta página reúne informações sobre como os dados podem ser coletados, utilizados, armazenados e protegidos durante a navegação no site e nos canais digitais da empresa.',
        ],
      },
      {
        titulo: 'Dados que podem ser tratados',
        paragrafos: [
          'Podemos tratar dados fornecidos voluntariamente em formulários, solicitações de cotação, contatos comerciais, cadastro de agregados, candidaturas de trabalho, newsletter, canais de atendimento e áreas restritas.',
          'Esses dados podem incluir nome, e-mail, telefone, empresa, cargo, cidade, informações profissionais, dados necessários à análise de solicitações e demais informações pertinentes à finalidade informada no momento da coleta.',
        ],
      },
      {
        titulo: 'Finalidades do tratamento',
        paragrafos: [
          'Os dados são utilizados para atendimento de solicitações, envio de comunicações, análise de oportunidades comerciais, gestão de candidaturas, cadastro de parceiros, execução de contratos, cumprimento de obrigações legais e melhoria da experiência nos canais digitais.',
          'O tratamento é realizado com base em hipóteses legais aplicáveis, como consentimento, execução de contrato, procedimentos preliminares, cumprimento de obrigação legal ou regulatória, legítimo interesse e exercício regular de direitos.',
        ],
      },
      {
        titulo: 'Direitos do titular',
        paragrafos: [
          'Nos termos da LGPD, o titular pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio, eliminação, portabilidade, informação sobre compartilhamento, revisão de decisões automatizadas, revogação do consentimento e demais direitos previstos em lei.',
          'As solicitações relacionadas a dados pessoais podem ser encaminhadas pelos canais oficiais de contato da Pizzattolog. A empresa poderá solicitar informações adicionais para confirmar a identidade do titular e proteger seus dados.',
        ],
      },
      {
        titulo: 'Segurança e retenção',
        paragrafos: [
          'A Pizzattolog adota medidas técnicas e administrativas para proteger dados pessoais contra acessos não autorizados, perda, alteração, divulgação indevida ou qualquer forma de tratamento inadequado.',
          'Os dados são mantidos pelo tempo necessário ao cumprimento das finalidades informadas, obrigações legais, regulatórias, contratuais e defesa de direitos, sendo eliminados ou anonimizados quando aplicável.',
        ],
      },
    ],
  },

  'politica-de-privacidade': {
    titulo: 'Política de Privacidade',
    resumo:
      'Saiba como a Pizzattolog coleta, utiliza e protege informações pessoais nos seus canais digitais.',
    secoes: [
      {
        titulo: 'Objetivo da política',
        paragrafos: [
          'Esta Política de Privacidade explica como a Pizzattolog coleta, utiliza, compartilha, armazena e protege informações pessoais em seus canais digitais, formulários, processos de atendimento e relacionamento.',
          'A política se aplica a visitantes do site, clientes, candidatos, agregados, fornecedores, parceiros e demais pessoas que interajam com a empresa por meios digitais.',
        ],
      },
      {
        titulo: 'Coleta de informações',
        paragrafos: [
          'As informações podem ser coletadas quando o usuário preenche formulários, solicita cotações, entra em contato, participa de processos seletivos, cadastra-se para comunicações, acessa conteúdos ou utiliza funcionalidades do site.',
          'Também podem ser coletadas informações técnicas de navegação, como endereço IP, identificadores de dispositivo, páginas acessadas, data e horário de acesso, origem de tráfego e cookies necessários ao funcionamento e melhoria da experiência.',
        ],
      },
      {
        titulo: 'Uso das informações',
        paragrafos: [
          'Os dados podem ser utilizados para responder solicitações, prestar atendimento, enviar comunicações autorizadas, avaliar oportunidades comerciais, analisar candidaturas, gerir cadastros, cumprir obrigações legais e aprimorar segurança e desempenho do site.',
          'A Pizzattolog trata as informações de acordo com finalidades legítimas e bases legais adequadas, respeitando princípios de necessidade, transparência, segurança, prevenção e responsabilização.',
        ],
      },
      {
        titulo: 'Compartilhamento',
        paragrafos: [
          'Informações pessoais podem ser compartilhadas com prestadores de serviços, parceiros operacionais, fornecedores de tecnologia, autoridades públicas ou terceiros quando necessário para executar finalidades informadas, cumprir obrigações legais ou proteger direitos.',
          'Quando houver compartilhamento, são adotadas medidas para limitar o acesso ao necessário e preservar a confidencialidade e segurança dos dados.',
        ],
      },
      {
        titulo: 'Cookies e preferências',
        paragrafos: [
          'O site pode utilizar cookies e tecnologias similares para funcionamento, segurança, análise de navegação e melhoria de experiência. O usuário pode configurar seu navegador para bloquear ou excluir cookies, observando que algumas funcionalidades podem ser afetadas.',
          'Cookies essenciais são necessários para disponibilizar recursos básicos do site, enquanto cookies analíticos e de desempenho ajudam a compreender o uso das páginas e aprimorar conteúdos.',
        ],
      },
      {
        titulo: 'Direitos e contato',
        paragrafos: [
          'O titular pode solicitar informações sobre tratamento, acesso, correção, exclusão, revogação de consentimento e demais direitos previstos na LGPD pelos canais oficiais de atendimento da Pizzattolog.',
          'A empresa poderá atualizar esta política periodicamente. Recomenda-se consultar esta página para acompanhar a versão mais recente.',
        ],
      },
    ],
  },

  'termos-de-uso': {
    titulo: 'Termos de Uso',
    resumo:
      'Regras para acesso e utilização do site, formulários, conteúdos e canais digitais da Pizzattolog.',
    secoes: [
      {
        titulo: 'Apresentação e aceitação',
        paragrafos: [
          'Estes Termos de Uso regulam o acesso e a utilização do site e dos canais digitais da Pizzattolog por usuários, clientes, candidatos, agregados, parceiros e demais visitantes.',
          'Ao navegar, preencher formulários, solicitar informações ou utilizar funcionalidades disponíveis, o usuário declara ter lido e aceitado estes termos, comprometendo-se a utilizá-los de forma ética, responsável e em conformidade com a legislação aplicável.',
        ],
      },
      {
        titulo: 'Uso da plataforma',
        paragrafos: [
          'O site disponibiliza informações institucionais, conteúdos sobre logística, soluções, canais de contato, solicitações comerciais, formulários, oportunidades de trabalho e demais funcionalidades relacionadas às atividades da Pizzattolog.',
          'O usuário é responsável pela veracidade, atualização e legalidade das informações fornecidas, bem como pelo uso adequado dos canais de atendimento e comunicação.',
        ],
      },
      {
        titulo: 'Condutas vedadas',
        paragrafos: [
          'É proibido utilizar o site para fins ilícitos, fraudulentos, ofensivos, discriminatórios, abusivos, para violar direitos de terceiros ou para comprometer a segurança, disponibilidade e integridade dos sistemas.',
          'Também é vedada a tentativa de acesso não autorizado, engenharia reversa, envio de vírus, sobrecarga da infraestrutura, reprodução indevida de conteúdos e qualquer prática que viole propriedade intelectual ou normas aplicáveis.',
        ],
      },
      {
        titulo: 'Propriedade intelectual',
        paragrafos: [
          'Marcas, logotipos, textos, imagens, layouts, conteúdos, materiais e demais elementos disponíveis no site pertencem à Pizzattolog ou a terceiros licenciantes, sendo protegidos pela legislação de propriedade intelectual.',
          'O acesso ao site não concede licença para reprodução, distribuição, alteração, exploração comercial ou uso de marcas e conteúdos sem autorização prévia e expressa.',
        ],
      },
      {
        titulo: 'Responsabilidades e alterações',
        paragrafos: [
          'A Pizzattolog busca manter informações atualizadas e canais digitais disponíveis, mas pode realizar alterações, suspensões, correções e melhorias a qualquer momento.',
          'Estes Termos podem ser atualizados periodicamente para refletir mudanças legais, operacionais ou tecnológicas. A continuidade de uso após a atualização implica ciência e aceitação da nova versão.',
        ],
      },
    ],
  },
};

const siteCurrentPageNames: Record<string, string> = {
  home: 'Página inicial',
  'quem-somos': 'Quem Somos',
  solucoes: 'Soluções',
  'especialidades-logisticas': 'Especialidades Logísticas',
  social: 'Social',
  carreiras: 'Carreiras',
  agregados: 'Agregados',
  esg: 'ESG',
  seminovos: 'Seminovos',
  'solicitar-cotacao': 'Solicitar Cotação',
  contatos: 'Contatos',
  blog: 'Blog',
  'lei-geral-de-protecao-de-dados': 'Lei Geral de Proteção de Dados',
  'politica-de-privacidade': 'Política de Privacidade',
  'termos-de-uso': 'Termos de Uso',
};

export type SiteCurrentPageContent = {
  slug: string;
  nome: string;
  conteudo: SiteDefaultContent;
};

export const siteCurrentPages: SiteCurrentPageContent[] =
  Object.entries(siteCurrentContent).map(
    ([slug, conteudo]) => ({
      slug,
      nome:
        siteCurrentPageNames[slug] ??
        slug,
      conteudo,
    }),
  );
