--
-- PostgreSQL database dump
--

\restrict xZeJ4aDeuIkiZnfJXbEnWWUhiOf5o868W9EMR9HBD7H2oLNZ8zmZW0uWiTCkQ90

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: postgres
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO postgres;

--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: postgres
--

COMMENT ON SCHEMA public IS '';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: AuditLogAction; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditLogAction" AS ENUM (
    'LOGIN',
    'LOGOUT',
    'LOGIN_FAILED',
    'SESSION_VALIDATED',
    'USER_CREATED',
    'USER_UPDATED',
    'USER_DELETED',
    'USER_STATUS_CHANGED',
    'CLIENT_CREATED',
    'CLIENT_UPDATED',
    'QUOTE_CREATED',
    'QUOTE_STATUS_CHANGED',
    'QUOTE_RESPONDED',
    'TICKET_CREATED',
    'TICKET_STATUS_CHANGED',
    'TRACKING_QUERIED',
    'TRACKING_UPDATED',
    'CUSTOM',
    'TICKET_RESPONDED',
    'OPPORTUNITY_CREATED',
    'OPPORTUNITY_STAGE_CHANGED',
    'SUPPLIER_INVITED',
    'QUOTE_DELETED',
    'CHAT_CREATED',
    'CHAT_PARTICIPANTS_CHANGED',
    'CHAT_MESSAGE_SENT',
    'CHAT_MESSAGE_UPDATED',
    'CHAT_MESSAGE_DELETED',
    'CHAT_MESSAGE_VISIBILITY_CHANGED',
    'PROPOSAL_SENT',
    'PROPOSAL_REJECTED'
);


ALTER TYPE public."AuditLogAction" OWNER TO postgres;

--
-- Name: AuditLogCategory; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditLogCategory" AS ENUM (
    'ACCESS',
    'AUTH',
    'USER',
    'CLIENT',
    'QUOTE',
    'TICKET',
    'TRACKING',
    'SYSTEM',
    'CHAT'
);


ALTER TYPE public."AuditLogCategory" OWNER TO postgres;

--
-- Name: AuditLogLevel; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."AuditLogLevel" AS ENUM (
    'INFO',
    'WARNING',
    'ERROR'
);


ALTER TYPE public."AuditLogLevel" OWNER TO postgres;

--
-- Name: ChatEntityType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ChatEntityType" AS ENUM (
    'LEAD',
    'CLIENTE',
    'COTACAO',
    'PROPOSTA',
    'TICKET'
);


ALTER TYPE public."ChatEntityType" OWNER TO postgres;

--
-- Name: ChatMessageVisibility; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ChatMessageVisibility" AS ENUM (
    'PUBLICA_CLIENTE',
    'INTERNA',
    'GESTAO_COMERCIAL',
    'PRIVADA_USUARIOS'
);


ALTER TYPE public."ChatMessageVisibility" OWNER TO postgres;

--
-- Name: ClientDeletionRequestStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ClientDeletionRequestStatus" AS ENUM (
    'PENDENTE',
    'APROVADA',
    'RECUSADA',
    'CANCELADA'
);


ALTER TYPE public."ClientDeletionRequestStatus" OWNER TO postgres;

--
-- Name: ContentType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ContentType" AS ENUM (
    'NOTICIA',
    'INFORMACAO',
    'VLOG'
);


ALTER TYPE public."ContentType" OWNER TO postgres;

--
-- Name: EntradaOrigem; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."EntradaOrigem" AS ENUM (
    'SITE',
    'PORTAL',
    'MANUAL'
);


ALTER TYPE public."EntradaOrigem" OWNER TO postgres;

--
-- Name: LeadImportJobStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LeadImportJobStatus" AS ENUM (
    'PROCESSING',
    'COMPLETED',
    'COMPLETED_WITH_ERRORS',
    'FAILED'
);


ALTER TYPE public."LeadImportJobStatus" OWNER TO postgres;

--
-- Name: LeadImportRowStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LeadImportRowStatus" AS ENUM (
    'IMPORTED',
    'SKIPPED',
    'FAILED'
);


ALTER TYPE public."LeadImportRowStatus" OWNER TO postgres;

--
-- Name: LeadTimelineEventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."LeadTimelineEventType" AS ENUM (
    'CREATED_MANUAL',
    'IMPORTED_CSV',
    'UPDATED',
    'WHATSAPP_CREATED',
    'WHATSAPP_INTERACTION',
    'NOTE_ADDED'
);


ALTER TYPE public."LeadTimelineEventType" OWNER TO postgres;

--
-- Name: MessageSenderType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."MessageSenderType" AS ENUM (
    'CLIENTE',
    'INTERNO',
    'AI',
    'CLIENT',
    'AGENT'
);


ALTER TYPE public."MessageSenderType" OWNER TO postgres;

--
-- Name: OpportunityStage; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OpportunityStage" AS ENUM (
    'NOVO',
    'QUALIFICADO',
    'PROPOSTA',
    'NEGOCIACAO',
    'GANHO',
    'PERDIDO'
);


ALTER TYPE public."OpportunityStage" OWNER TO postgres;

--
-- Name: OpportunityStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."OpportunityStatus" AS ENUM (
    'OPEN',
    'WON',
    'LOST'
);


ALTER TYPE public."OpportunityStatus" OWNER TO postgres;

--
-- Name: ProspectPortalAccessStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProspectPortalAccessStatus" AS ENUM (
    'SEM_ACESSO',
    'CONVITE_ENVIADO',
    'ATIVO',
    'BLOQUEADO'
);


ALTER TYPE public."ProspectPortalAccessStatus" OWNER TO postgres;

--
-- Name: ProspectStatusCadastral; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ProspectStatusCadastral" AS ENUM (
    'PROSPECT',
    'AGUARDANDO_CADASTRO',
    'EM_VALIDACAO',
    'ATIVO',
    'REPROVADO',
    'INATIVO'
);


ALTER TYPE public."ProspectStatusCadastral" OWNER TO postgres;

--
-- Name: QuoteStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."QuoteStatus" AS ENUM (
    'RECEIVED',
    'IN_ANALYSIS',
    'ANSWERED',
    'APPROVED',
    'REJECTED'
);


ALTER TYPE public."QuoteStatus" OWNER TO postgres;

--
-- Name: ShipmentStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."ShipmentStatus" AS ENUM (
    'RECEIVED',
    'PREPARING',
    'COLLECTED',
    'IN_TRANSIT',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'ISSUE'
);


ALTER TYPE public."ShipmentStatus" OWNER TO postgres;

--
-- Name: StatusLogEmail; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StatusLogEmail" AS ENUM (
    'PENDENTE',
    'ENVIADO',
    'FALHOU',
    'IGNORADO'
);


ALTER TYPE public."StatusLogEmail" OWNER TO postgres;

--
-- Name: StatusProposta; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."StatusProposta" AS ENUM (
    'RASCUNHO',
    'ENVIADA_AO_CLIENTE',
    'APROVADA_PELO_CLIENTE',
    'RECUSADA_PELO_CLIENTE',
    'AJUSTE_SOLICITADO_PELO_CLIENTE',
    'ENVIADA_PARA_GESTAO',
    'APROVADA_PELA_GESTAO',
    'RECUSADA_PELA_GESTAO',
    'AJUSTE_SOLICITADO_PELA_GESTAO',
    'CANCELADA',
    'EXPIRADA'
);


ALTER TYPE public."StatusProposta" OWNER TO postgres;

--
-- Name: SupplierInviteStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."SupplierInviteStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'EXPIRED',
    'CANCELLED'
);


ALTER TYPE public."SupplierInviteStatus" OWNER TO postgres;

--
-- Name: TicketHistoryEventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketHistoryEventType" AS ENUM (
    'CREATED',
    'STATUS_CHANGED',
    'MESSAGE_SENT',
    'INTERNAL_NOTE',
    'NOTIFICATION_SENT',
    'EMAIL_SENT',
    'PRE_PROPOSAL_SENT',
    'APPROVAL_SENT',
    'APPROVED',
    'REJECTED',
    'ADJUSTMENT_REQUESTED',
    'CLOSED'
);


ALTER TYPE public."TicketHistoryEventType" OWNER TO postgres;

--
-- Name: TicketPriority; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketPriority" AS ENUM (
    'BAIXA',
    'NORMAL',
    'ALTA',
    'URGENTE'
);


ALTER TYPE public."TicketPriority" OWNER TO postgres;

--
-- Name: TicketStatus; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketStatus" AS ENUM (
    'NOVO',
    'EM_ANDAMENTO',
    'AGUARDANDO_CLIENTE',
    'FECHADO',
    'NEW',
    'IN_PROGRESS',
    'WAITING_CUSTOMER',
    'CLOSED',
    'ABERTO',
    'AGUARDANDO_COMERCIAL',
    'AGUARDANDO_GESTAO',
    'RESPONDIDO',
    'APROVADO_CLIENTE',
    'APROVADO_GESTAO',
    'AJUSTE_SOLICITADO',
    'REPROVADO',
    'CANCELADO',
    'CONVERTIDO_EM_PROSPECT',
    'COTACAO_CRIADA',
    'FINALIZADO',
    'PERDIDO',
    'TRANSFERIDO'
);


ALTER TYPE public."TicketStatus" OWNER TO postgres;

--
-- Name: TicketType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TicketType" AS ENUM (
    'COTACAO',
    'LEAD',
    'PRE_NEGOCIACAO',
    'APROVACAO_GESTAO',
    'AJUSTE_CLIENTE',
    'AJUSTE_GESTAO',
    'SUPORTE',
    'DOCUMENTACAO',
    'OPERACIONAL',
    'FORNECEDOR',
    'AGREGADO',
    'FINANCEIRO',
    'FISCAL',
    'JURIDICO',
    'MARKETING',
    'FROTA'
);


ALTER TYPE public."TicketType" OWNER TO postgres;

--
-- Name: TimelineEventType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."TimelineEventType" AS ENUM (
    'LEAD_CREATED',
    'LEAD_UPDATED',
    'OPPORTUNITY_CREATED',
    'STAGE_CHANGED',
    'NOTE_ADDED',
    'OPPORTUNITY_WON',
    'OPPORTUNITY_LOST'
);


ALTER TYPE public."TimelineEventType" OWNER TO postgres;

--
-- Name: UserRole; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."UserRole" AS ENUM (
    'ADMIN',
    'GESTAO',
    'COMERCIAL',
    'MARKETING',
    'CLIENTE'
);


ALTER TYPE public."UserRole" OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: AuditLog; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."AuditLog" (
    id text NOT NULL,
    category public."AuditLogCategory" NOT NULL,
    action public."AuditLogAction" NOT NULL,
    level public."AuditLogLevel" DEFAULT 'INFO'::public."AuditLogLevel" NOT NULL,
    message text NOT NULL,
    details jsonb,
    "ipAddress" text,
    "userAgent" text,
    route text,
    method text,
    "targetType" text,
    "targetId" text,
    success boolean DEFAULT true NOT NULL,
    "userId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."AuditLog" OWNER TO postgres;

--
-- Name: Chat; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Chat" (
    id text NOT NULL,
    "entityType" public."ChatEntityType" NOT NULL,
    "entityId" text NOT NULL,
    title text,
    "leadId" text,
    "clientId" text,
    "quoteId" text,
    "propostaId" text,
    "ticketId" text,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Chat" OWNER TO postgres;

--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "chatId" text NOT NULL,
    "authorId" text NOT NULL,
    content text NOT NULL,
    visibility public."ChatMessageVisibility" DEFAULT 'PUBLICA_CLIENTE'::public."ChatMessageVisibility" NOT NULL,
    "editedAt" timestamp(3) without time zone,
    "deletedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."ChatMessage" OWNER TO postgres;

--
-- Name: ChatMessageRecipient; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatMessageRecipient" (
    id text NOT NULL,
    "messageId" text NOT NULL,
    "userId" text NOT NULL
);


ALTER TABLE public."ChatMessageRecipient" OWNER TO postgres;

--
-- Name: ChatParticipant; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ChatParticipant" (
    id text NOT NULL,
    "chatId" text NOT NULL,
    "userId" text NOT NULL,
    "canRead" boolean DEFAULT true NOT NULL,
    "canWrite" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "lastReadAt" timestamp(3) without time zone
);


ALTER TABLE public."ChatParticipant" OWNER TO postgres;

--
-- Name: Client; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Client" (
    id text NOT NULL,
    "userId" text NOT NULL,
    document text,
    phone text,
    "companyName" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "internalOwnerId" text,
    notes text,
    segment text,
    status text
);


ALTER TABLE public."Client" OWNER TO postgres;

--
-- Name: ClientDeletionRequest; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."ClientDeletionRequest" (
    id text NOT NULL,
    "clientId" text,
    "requestedById" text NOT NULL,
    "approvedById" text,
    status public."ClientDeletionRequestStatus" DEFAULT 'PENDENTE'::public."ClientDeletionRequestStatus" NOT NULL,
    reason text,
    "managementResponse" text,
    "clientNameSnapshot" text,
    "clientEmailSnapshot" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "decidedAt" timestamp(3) without time zone
);


ALTER TABLE public."ClientDeletionRequest" OWNER TO postgres;

--
-- Name: Lead; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Lead" (
    id text NOT NULL,
    name text NOT NULL,
    email text,
    phone text,
    company text,
    source text DEFAULT 'manual'::text NOT NULL,
    status text DEFAULT 'new'::text NOT NULL,
    notes text,
    "normalizedEmail" text,
    "normalizedPhone" text,
    channel text,
    "sourcePhone" text,
    "externalMessageId" text,
    "externalContactId" text,
    metadata jsonb,
    "rawPayload" jsonb,
    "lastInteractionAt" timestamp(3) without time zone,
    "createdById" text,
    "updatedById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Lead" OWNER TO postgres;

--
-- Name: LeadImportJob; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LeadImportJob" (
    id text NOT NULL,
    "fileName" text NOT NULL,
    "sourceFileType" text NOT NULL,
    "totalRows" integer DEFAULT 0 NOT NULL,
    "successCount" integer DEFAULT 0 NOT NULL,
    "ignoredCount" integer DEFAULT 0 NOT NULL,
    "failureCount" integer DEFAULT 0 NOT NULL,
    status public."LeadImportJobStatus" DEFAULT 'PROCESSING'::public."LeadImportJobStatus" NOT NULL,
    summary jsonb,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "completedAt" timestamp(3) without time zone
);


ALTER TABLE public."LeadImportJob" OWNER TO postgres;

--
-- Name: LeadImportRowResult; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LeadImportRowResult" (
    id text NOT NULL,
    "jobId" text NOT NULL,
    "rowNumber" integer NOT NULL,
    status public."LeadImportRowStatus" NOT NULL,
    reason text,
    "rawData" jsonb,
    "leadId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LeadImportRowResult" OWNER TO postgres;

--
-- Name: LeadTimelineEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LeadTimelineEvent" (
    id text NOT NULL,
    "leadId" text NOT NULL,
    type public."LeadTimelineEventType" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."LeadTimelineEvent" OWNER TO postgres;

--
-- Name: LogEmail; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."LogEmail" (
    id text NOT NULL,
    "ticketId" text,
    "propostaId" text,
    "notificationId" text,
    "userId" text,
    "emailDestino" text NOT NULL,
    assunto text NOT NULL,
    resumo text,
    template text,
    status public."StatusLogEmail" DEFAULT 'PENDENTE'::public."StatusLogEmail" NOT NULL,
    provedor text,
    "idMensagemProvedor" text,
    "mensagemErro" text,
    "enviadoEm" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."LogEmail" OWNER TO postgres;

--
-- Name: Notification; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Notification" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "ticketId" text,
    title text NOT NULL,
    message text NOT NULL,
    link text,
    metadata jsonb,
    "readAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."Notification" OWNER TO postgres;

--
-- Name: Opportunity; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Opportunity" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    title text NOT NULL,
    value numeric(65,30),
    stage public."OpportunityStage" DEFAULT 'NOVO'::public."OpportunityStage" NOT NULL,
    status public."OpportunityStatus" DEFAULT 'OPEN'::public."OpportunityStatus" NOT NULL,
    "expectedCloseDate" timestamp(3) without time zone,
    "lostReason" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "quoteId" text,
    "preContract" boolean DEFAULT false NOT NULL,
    "preContractNotes" text
);


ALTER TABLE public."Opportunity" OWNER TO postgres;

--
-- Name: PortalContent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."PortalContent" (
    id text NOT NULL,
    title text NOT NULL,
    summary text NOT NULL,
    body text NOT NULL,
    type public."ContentType" NOT NULL,
    "coverImageUrl" text,
    "videoUrl" text,
    "isPublished" boolean DEFAULT false NOT NULL,
    "publishedAt" timestamp(3) without time zone,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "campaignName" text,
    "ctaLabel" text,
    "ctaUrl" text,
    highlight boolean DEFAULT false NOT NULL
);


ALTER TABLE public."PortalContent" OWNER TO postgres;

--
-- Name: Proposta; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Proposta" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "quoteId" text,
    "opportunityId" text,
    "clientId" text,
    "criadaPorId" text,
    "enviadaPorId" text,
    status public."StatusProposta" DEFAULT 'RASCUNHO'::public."StatusProposta" NOT NULL,
    titulo text NOT NULL,
    descricao text,
    "descricaoServico" text,
    origem text,
    destino text,
    valor numeric(65,30),
    "condicoesPagamento" text,
    "condicoesComerciais" text,
    observacoes text,
    "validadeDias" text,
    "validaAte" timestamp(3) without time zone,
    versao integer DEFAULT 1 NOT NULL,
    "enviadaEm" timestamp(3) without time zone,
    "aprovadaPeloClienteEm" timestamp(3) without time zone,
    "recusadaPeloClienteEm" timestamp(3) without time zone,
    "ajusteSolicitadoPeloClienteEm" timestamp(3) without time zone,
    "enviadaParaGestaoEm" timestamp(3) without time zone,
    "aprovadaPelaGestaoEm" timestamp(3) without time zone,
    "recusadaPelaGestaoEm" timestamp(3) without time zone,
    "ajusteSolicitadoPelaGestaoEm" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    code text NOT NULL,
    "arquivoNome" text,
    "arquivoUrl" text,
    "arquivoMimeType" text,
    "arquivoTamanho" integer,
    "motivoRecusaCliente" text
);


ALTER TABLE public."Proposta" OWNER TO postgres;

--
-- Name: Prospect; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Prospect" (
    id text NOT NULL,
    "nomeRazaoSocial" text NOT NULL,
    "nomeContato" text,
    email text,
    telefone text,
    document text,
    cidade text,
    estado text,
    origem public."EntradaOrigem" DEFAULT 'SITE'::public."EntradaOrigem" NOT NULL,
    "statusCadastral" public."ProspectStatusCadastral" DEFAULT 'PROSPECT'::public."ProspectStatusCadastral" NOT NULL,
    "portalAccessStatus" public."ProspectPortalAccessStatus" DEFAULT 'SEM_ACESSO'::public."ProspectPortalAccessStatus" NOT NULL,
    "createdFromTicketId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Prospect" OWNER TO postgres;

--
-- Name: Quote; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Quote" (
    id text NOT NULL,
    "clientId" text,
    origin text NOT NULL,
    destination text NOT NULL,
    "serviceType" text NOT NULL,
    weight double precision,
    volume double precision,
    quantity integer,
    "desiredDeadline" text,
    notes text,
    price numeric(65,30),
    "commercialNotes" text,
    status public."QuoteStatus" DEFAULT 'RECEIVED'::public."QuoteStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "cargoDescription" text,
    "contactName" text,
    "contactPhone" text,
    "deliveryAddress" text,
    "merchandiseValue" numeric(65,30),
    "pickupAddress" text,
    "requestType" text,
    "contactEmail" text,
    code text NOT NULL,
    "prospectId" text
);


ALTER TABLE public."Quote" OWNER TO postgres;

--
-- Name: QuoteHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."QuoteHistory" (
    id text NOT NULL,
    "quoteId" text NOT NULL,
    status public."QuoteStatus" NOT NULL,
    notes text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."QuoteHistory" OWNER TO postgres;

--
-- Name: SupplierInvite; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."SupplierInvite" (
    id text NOT NULL,
    "companyName" text NOT NULL,
    "contactName" text,
    email text NOT NULL,
    phone text,
    token text NOT NULL,
    status public."SupplierInviteStatus" DEFAULT 'PENDING'::public."SupplierInviteStatus" NOT NULL,
    notes text,
    "invitedById" text,
    "acceptedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."SupplierInvite" OWNER TO postgres;

--
-- Name: Ticket; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Ticket" (
    id text NOT NULL,
    "clientId" text,
    subject text NOT NULL,
    description text NOT NULL,
    status public."TicketStatus" DEFAULT 'ABERTO'::public."TicketStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "quoteId" text,
    "leadId" text,
    "opportunityId" text,
    "assignedToId" text,
    "requesterId" text,
    type public."TicketType" DEFAULT 'SUPORTE'::public."TicketType" NOT NULL,
    "requiresActionRole" public."UserRole",
    "lastInteractionAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "internalOnly" boolean DEFAULT false NOT NULL,
    protocolo text,
    "prospectId" text,
    origem public."EntradaOrigem",
    prioridade public."TicketPriority" DEFAULT 'NORMAL'::public."TicketPriority" NOT NULL,
    "nomeSolicitante" text,
    "emailSolicitante" text,
    "telefoneSolicitante" text,
    mensagem text,
    "formPayload" jsonb,
    "closedAt" timestamp(3) without time zone
);


ALTER TABLE public."Ticket" OWNER TO postgres;

--
-- Name: TicketHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TicketHistory" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "eventType" public."TicketHistoryEventType" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    "internalOnly" boolean DEFAULT false NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TicketHistory" OWNER TO postgres;

--
-- Name: TicketMessage; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TicketMessage" (
    id text NOT NULL,
    "ticketId" text NOT NULL,
    "senderType" public."MessageSenderType" DEFAULT 'INTERNO'::public."MessageSenderType" NOT NULL,
    message text NOT NULL,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isInternal" boolean DEFAULT false NOT NULL,
    attachments jsonb
);


ALTER TABLE public."TicketMessage" OWNER TO postgres;

--
-- Name: TimelineEvent; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TimelineEvent" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    type public."TimelineEventType" NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    metadata jsonb,
    "createdById" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."TimelineEvent" OWNER TO postgres;

--
-- Name: Tracking; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."Tracking" (
    id text NOT NULL,
    "clientId" text NOT NULL,
    code text NOT NULL,
    origin text,
    destination text,
    carrier text,
    status public."ShipmentStatus" DEFAULT 'RECEIVED'::public."ShipmentStatus" NOT NULL,
    description text,
    "estimatedDate" timestamp(3) without time zone,
    "deliveredAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


ALTER TABLE public."Tracking" OWNER TO postgres;

--
-- Name: TrackingHistory; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."TrackingHistory" (
    id text NOT NULL,
    "trackingId" text NOT NULL,
    status public."ShipmentStatus" NOT NULL,
    location text,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE public."TrackingHistory" OWNER TO postgres;

--
-- Name: User; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public."User" (
    id text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    "passwordHash" text NOT NULL,
    role public."UserRole" DEFAULT 'CLIENTE'::public."UserRole" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "mustChangePassword" boolean DEFAULT true NOT NULL
);


ALTER TABLE public."User" OWNER TO postgres;

--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


ALTER TABLE public._prisma_migrations OWNER TO postgres;

--
-- Data for Name: AuditLog; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."AuditLog" (id, category, action, level, message, details, "ipAddress", "userAgent", route, method, "targetType", "targetId", success, "userId", "createdAt") FROM stdin;
578961b5-6741-4d8b-9da0-511a2db98e78	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: admin@crm.com.	{"email": "admin@crm.com"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-29 13:37:02.86
83f3e743-063a-438b-857c-a9e56bee26b1	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: caroline.augusto@pizzattolog.com.br.	{"email": "caroline.augusto@pizzattolog.com.br"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-29 13:38:55.443
245e52b0-5966-46ac-8a8c-e81db327d293	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: caroline.augusto@pizzattolog.com.br.	{"email": "caroline.augusto@pizzattolog.com.br"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-29 13:38:59.752
6eac68b6-0682-410d-97f0-0acf5beeeeae	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: caroline.augusto@pizzattolog.com.br.	{"email": "caroline.augusto@pizzattolog.com.br"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-29 14:58:11.5
e446d015-5541-4b71-85e0-7118e61ff87a	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: caroline.augusto@pizzattolog.com.br.	{"email": "caroline.augusto@pizzattolog.com.br"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-29 14:58:12.282
c9c73ffb-6676-4244-8f4c-99e8b4a18625	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: caroline.augusto@pizzattolog.com.br.	{"email": "caroline.augusto@pizzattolog.com.br"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-29 14:58:13.223
fefd7455-bc3a-47e0-b63b-a85c2dce051d	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 15:21:51.388
dc47dc4c-f3cd-4b41-8757-2974e44e30a4	USER	USER_CREATED	INFO	Usuario criado: Boticário.	{"role": "CLIENTE", "email": "boticario@teste.com.br"}	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 15:23:31.114
b024955d-e22a-4b19-8544-f1d1bfd9bdf7	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 16:37:45.656
eb773658-068e-4797-934d-608bf3b46b8d	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 16:46:18.094
255e2ee1-8cd7-4fef-9b4a-26a41b33de30	QUOTE	QUOTE_CREATED	INFO	Cotacao criada para Boticário.	{"clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "requestType": "Contrato", "serviceType": "fracionado"}	\N	\N	\N	\N	Quote	b58bcd03-2b97-4a91-9133-b95442a64b3a	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 16:48:16.763
a342092d-6ec3-4800-ab39-e6abf99f8c34	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 16:56:43.518
78f6624e-d24a-43ec-a97a-8ada6a07c28a	USER	USER_CREATED	INFO	Usuario criado: comercial.	{"role": "COMERCIAL", "email": "comercial@teste.com"}	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 16:57:23.669
a41c3ee3-0ffa-42a4-9d98-d6a1b38d8cab	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 16:58:09.737
310c4041-10c8-483d-926b-45d76495d611	QUOTE	QUOTE_STATUS_CHANGED	INFO	Status da cotacao alterado para IN_ANALYSIS.	{"notes": null, "status": "IN_ANALYSIS"}	\N	\N	\N	\N	Quote	b58bcd03-2b97-4a91-9133-b95442a64b3a	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:01:28.515
85e909f2-b4c3-4f0e-850c-4dfe0eca4673	QUOTE	QUOTE_RESPONDED	INFO	Proposta comercial enviada para cotacao.	{"price": 18900}	\N	\N	\N	\N	Quote	b58bcd03-2b97-4a91-9133-b95442a64b3a	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:01:56.619
fe7ad744-579c-4ef5-8d4f-b34ae40a6db1	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:03:02.957
213b61f4-3e9c-4b5d-872c-400196ba77cb	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:05:26.92
b656efd6-3369-4d45-81bf-a1d81003b8a9	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:07:36.229
06d47e55-2106-4b60-904f-6858655a5a55	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:31:30.055
c0d6b42c-b5ed-4092-b382-46eb54c3de90	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para RESPONDIDO.	{"status": "RESPONDIDO"}	\N	\N	\N	\N	Ticket	15c10af2-bea5-4a3c-a424-f1a845b952e2	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:32:19.63
eb753ecd-b877-4366-9377-28b1d84a9b71	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:32:50.891
0066ec74-3dde-4282-af20-cadd3ae8e9be	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:33:34.573
2e316e26-204b-4c32-9dc3-87d03eba4bb2	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para AGUARDANDO_GESTAO.	{"status": "AGUARDANDO_GESTAO"}	\N	\N	\N	\N	Ticket	15c10af2-bea5-4a3c-a424-f1a845b952e2	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:33:45.653
0634bb3d-9fce-49c9-988a-b77dd063f8cc	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:34:11.718
37b04253-ba44-437c-89c9-93cfbbba0a76	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-29 17:34:50.862
28c33058-ba55-4ac0-8fe1-a76d0b47aba8	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para RESPONDIDO.	{"status": "RESPONDIDO"}	\N	\N	\N	\N	Ticket	15c10af2-bea5-4a3c-a424-f1a845b952e2	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-29 17:35:30.004
ad432e2f-da6c-47ee-a16b-73f354b699ca	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para ABERTO.	{"status": "ABERTO"}	\N	\N	\N	\N	Ticket	15c10af2-bea5-4a3c-a424-f1a845b952e2	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-29 17:35:45.062
9cabbe96-2e96-45c5-b793-484c46aa3c39	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:36:13.126
eaddb7df-107a-4eb6-a69b-c54c17409143	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:36:42.176
e325935a-da95-4788-859c-b401f7d56866	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-29 17:37:06.537
57f04503-89c2-405d-b7da-ca40fcc5c927	AUTH	LOGIN	INFO	Login realizado por cliente@teste.com.	\N	\N	\N	\N	\N	User	75012ad8-8d94-41de-bece-642ff0fad29b	t	\N	2026-04-29 15:18:00.592
2f696a7f-b6e6-460f-9c79-b07bc745159e	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para AGUARDANDO_GESTAO.	{"status": "AGUARDANDO_GESTAO"}	\N	\N	\N	\N	Ticket	15c10af2-bea5-4a3c-a424-f1a845b952e2	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-29 17:37:22.896
9e04f119-1619-4b66-9333-4073e50aa9e8	AUTH	LOGIN_FAILED	WARNING	Tentativa de login com senha invalida para comercial@teste.com.	{"email": "comercial@teste.com"}	\N	\N	\N	\N	\N	\N	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:38:25.354
9b3a542a-10ae-41fe-966b-2724497e2d8f	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:38:28.937
bede1a7f-4e5d-4fe7-ac74-fe10f3665be8	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:39:00.02
e37e9c74-ca9b-4021-8006-f29a14b6e482	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 17:39:49.14
e75cd8a7-3ae0-419c-81ca-9ca53e18b6c6	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-29 17:48:06.34
55f51081-41f2-44ef-8193-d510cd94e912	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:49:12.598
70be0e70-3119-4f2b-b696-8d3071d61386	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:49:49.679
7938854c-db58-4962-9237-1a62367ce5c6	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:50:47.244
3de34502-7c9f-4fc6-971c-2b50d97b3f3a	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-29 17:51:45.404
8a7a1278-ecba-470a-9a31-fe21c66a6ac2	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-29 17:52:53.422
c70c7e22-9efb-491e-a496-159cc5980729	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 17:53:28.245
4d8a4587-dbaa-481b-9c5f-e259b8043b2c	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 19:54:21.163
6f1a0ba3-0a0a-409a-91a3-aad98e9b8b08	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 11:53:31.735
582af2b1-7617-4e16-ad88-cf85e8ec1a6f	USER	USER_UPDATED	INFO	Senha atualizada por gestao@teste.com.	{"mustChangePassword": false}	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 11:53:58.073
54df3910-d43c-453b-b3bb-b94ecc6461a6	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: admin@crm.com.br.	{"email": "admin@crm.com.br"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-30 12:13:53.791
7e34e9bb-1464-4a53-8d0f-0884ed9598ba	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: admin@crm.com.	{"email": "admin@crm.com"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-30 12:13:57.405
9532e04f-0d95-44ae-8243-f6aad466446a	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: admin@crm.com.	{"email": "admin@crm.com"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-30 12:14:01.528
534dbae6-d5e5-4ea0-8d9e-e4d23a08d47b	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-30 12:14:09.315
6bd28ee9-1c7f-4f21-988c-2c5378f48b6e	USER	USER_UPDATED	INFO	Senha atualizada por admin@teste.com.	{"mustChangePassword": false}	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-30 12:14:21.139
b5c852a4-5bba-4655-866c-e09323e243e4	USER	USER_UPDATED	INFO	Usuario atualizado: comercial.	{"role": "COMERCIAL", "email": "comercial@teste.com"}	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-30 12:14:42.687
be3bbadf-25fb-4521-9ac9-d71e93f621ad	AUTH	LOGIN	INFO	Login realizado por cliente@teste.com.	\N	\N	\N	\N	\N	User	75012ad8-8d94-41de-bece-642ff0fad29b	t	\N	2026-04-29 16:35:19.026
1b807dcd-c19b-4909-87d4-201c5ac00c96	AUTH	LOGIN	INFO	Login realizado por cliente@teste.com.	\N	\N	\N	\N	\N	User	75012ad8-8d94-41de-bece-642ff0fad29b	t	\N	2026-04-29 16:36:28.444
75601dc3-5798-40fc-9be6-ea2c274c10e1	AUTH	LOGIN	INFO	Login realizado por cliente@teste.com.	\N	\N	\N	\N	\N	User	75012ad8-8d94-41de-bece-642ff0fad29b	t	\N	2026-04-30 12:11:57.848
7c08a9c3-5874-419a-881e-3a99543701b9	USER	USER_UPDATED	INFO	Senha atualizada por cliente@teste.com.	{"mustChangePassword": false}	\N	\N	\N	\N	User	75012ad8-8d94-41de-bece-642ff0fad29b	t	\N	2026-04-30 12:12:08.824
c6f62045-07a3-4831-ba4a-593306a0a414	USER	USER_DELETED	INFO	Usuario removido: cliente@teste.com.	\N	\N	\N	\N	\N	User	75012ad8-8d94-41de-bece-642ff0fad29b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-30 12:16:05.702
a029291c-242f-4c96-b7e2-0ac912db5bd2	USER	USER_UPDATED	INFO	Usuario atualizado: Boticário.	{"role": "CLIENTE", "email": "boticario@teste.com.br"}	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-30 12:16:18.9
52abbf08-5eb1-4fd0-9fcd-7ffa4b2c9d4b	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:16:23.089
4c431e9d-6910-4c5e-bc53-f6f5a76bef4c	USER	USER_UPDATED	INFO	Senha atualizada por boticario@teste.com.br.	{"mustChangePassword": false}	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:16:32.634
31655ac0-e4d5-43e3-bce1-29d3b398f92f	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:16:39.197
c8307c30-ff83-4dfe-a76a-c88aaf678634	QUOTE	QUOTE_CREATED	INFO	Cotacao criada para Boticário.	{"clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "requestType": "Contrato", "serviceType": "Fracionado"}	\N	\N	\N	\N	Quote	8e786a4c-3ab2-4150-8d8e-949320c8c1c8	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:18:28.495
116230e5-3465-45ed-8cf5-99926663760f	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 12:22:27.536
2218d04e-27da-4aa8-bcfe-023592bad519	USER	USER_UPDATED	INFO	Senha atualizada por comercial@teste.com.	{"mustChangePassword": false}	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 12:22:36.315
bd6be9f4-7cd9-4cee-836c-cb1f2a6d76d6	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-01 19:26:30.342
8b369773-198a-4772-ac80-fa8a9b31593f	TICKET	TICKET_RESPONDED	INFO	Resposta registrada no ticket Nova cotacao: Fracionado.	{"isInternal": true, "nextStatus": "AGUARDANDO_COMERCIAL", "senderType": "INTERNO"}	\N	\N	\N	\N	Ticket	5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 12:26:33.866
7361bfb3-b9f3-464d-a4ca-ed5b0f7db755	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para AGUARDANDO_CLIENTE.	{"status": "AGUARDANDO_CLIENTE"}	\N	\N	\N	\N	Ticket	5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 12:30:47.672
de0fd142-efc9-4904-81b3-12a5fceb7947	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 12:31:35.47
cdf33497-0a65-4848-92c9-393eefad6692	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:31:57.877
7ec973e5-4e13-4a11-b357-6a248b05f0d3	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 12:33:40.267
a59d3a35-9e47-46fd-bcaa-5553e83173ca	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 12:34:24.257
28e692fd-bc88-49d8-b061-f94a39941d03	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para GANHO.	{"to": "GANHO", "from": "NOVO", "lostReason": null}	\N	\N	\N	\N	Opportunity	f8965cd2-689e-4a25-89f9-959ba3558d58	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 12:37:16.447
62a3acb1-7b2d-4d06-946d-40f4dc8d452d	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "NOVO", "lostReason": "Não prosseguimos com as negociações."}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 12:37:38.607
850b8848-a4cd-4d9d-a51f-fd6633eeaea4	QUOTE	QUOTE_STATUS_CHANGED	INFO	Status da cotacao alterado para Aprovada.	{"notes": null, "status": "APPROVED"}	\N	\N	\N	\N	Quote	8e786a4c-3ab2-4150-8d8e-949320c8c1c8	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 12:49:16.626
cfeeff00-f73c-4606-af59-4f9817c8e228	TICKET	TICKET_CREATED	INFO	Ticket criado: Entrar em contato com o time Boticário.	{"type": "LEAD", "leadId": null, "status": "ABERTO", "quoteId": null, "clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "opportunityId": null}	\N	\N	\N	\N	Ticket	6be6020b-05e2-4bee-a931-76247207b097	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 12:54:33.024
11a0fc7e-4068-465c-b987-d904a94c52be	AUTH	LOGIN_FAILED	WARNING	Tentativa de login para e-mail inexistente: cliente@teste.com.	{"email": "cliente@teste.com"}	\N	\N	\N	\N	\N	\N	f	\N	2026-04-30 12:55:07.777
e50a678b-2e02-483a-b8b2-8c2323a52686	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:55:16.889
4ea985d6-f0f3-4871-9278-c0d2c3c48f4e	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 12:56:11.993
66a80563-7b4a-432a-94dc-ac2a40c62689	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:58:52.299
38946b7c-edfb-46a5-a6cc-c4bc65bcd3eb	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 13:00:22.352
6e3766f8-b3e6-4c5c-85d3-e194c8b4aa94	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 13:00:50.547
ab35e72b-d7c7-4a35-b223-9e2a422faeaf	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 13:01:40.568
834900ab-8fce-439d-881f-c8403852efe2	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 13:02:21.011
2073c9f8-a56e-4e6f-a9e5-6b8ed8ca8b24	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 13:04:19.384
05087003-7511-4eb2-b2e7-892245f166f0	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para ABERTO.	{"status": "ABERTO"}	\N	\N	\N	\N	Ticket	6be6020b-05e2-4bee-a931-76247207b097	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 13:04:40.309
e31f5b1c-17c9-4602-905a-d574f3510d2e	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para REPROVADO.	{"status": "REPROVADO"}	\N	\N	\N	\N	Ticket	6be6020b-05e2-4bee-a931-76247207b097	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 13:05:40.821
97813471-6e53-4e1b-ae66-90ad0d8236d5	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 13:07:28.243
096b0e0f-cebe-456c-bb6e-d8a5018321d8	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 13:09:13.175
2de3d601-266e-4d9a-afdc-181dea54378b	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 17:06:27.159
8e3ba605-3ad9-4e2d-8908-ad05a97ab250	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 17:18:08.83
ef49f07b-c141-40e1-aadd-970e0ab69fd0	QUOTE	QUOTE_CREATED	INFO	Cotacao criada para Boticário.	{"clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "requestType": "Contrato", "serviceType": "Fracionado"}	\N	\N	\N	\N	Quote	562ac288-b56c-4ed5-9557-6541cb9303cc	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 17:19:58.641
a40a03cd-ab60-4cab-a577-a4bd1f0c4b57	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 17:20:16.639
f7b0a8a7-729a-4e90-a92c-012b2c467705	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 17:26:05.003
f7157e07-0452-40a8-9bb8-85bd234d3281	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 17:26:35.153
5897802d-5262-418d-aee1-b66d2153110f	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 17:26:57.936
93195ff8-14cd-476c-9a7c-e511ba191d60	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 17:27:41.136
7d0a5a60-d18e-4b38-baaa-4e2fde3fe5e8	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-04-30 17:30:11.779
20affb86-9003-46b7-b06a-66cd020921a4	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-01 19:23:11.552
8ca9d4c7-adb5-4bdf-8891-0285f0264a15	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-01 19:25:37.466
9e7e1297-e269-4b12-b098-2093f095d9ed	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-01 19:30:10.077
74691501-e128-4e05-a408-dbc4a077bb52	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 11:58:41.645
2bfe27cb-4b7d-4ca9-8adf-5602585a6afa	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Não prosseguimos com as negociações."}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:46:49.772
3b659620-fb3e-4a94-9d18-7b750fa09ecf	CLIENT	CLIENT_UPDATED	INFO	Cliente atualizado: Boticário.	{"changedFields": ["telefone"]}	\N	\N	\N	\N	Client	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:47:22.876
f1d8c05b-f25e-4d16-ba13-4cce4e375d9c	CLIENT	CLIENT_UPDATED	INFO	Cliente atualizado: Boticário.	{"changedFields": ["telefone"]}	\N	\N	\N	\N	Client	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:47:30.651
640b5e3c-3b6a-410a-9e33-b76fa51fc23b	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Não prosseguimos com as negociações."}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:15.876
620b4178-312f-49d7-8bec-f2776f7682b1	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Não prosseguimos com as negociações."}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:18.473
5656e07a-4a83-4c29-8ccf-a10c20a76aa9	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PROPOSTA.	{"to": "PROPOSTA", "from": "PERDIDO", "lostReason": null}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:20.946
e03559aa-9b1c-4c40-b912-6dbf2b3bab91	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "PROPOSTA", "lostReason": "Desistido"}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:58.961
1be48b95-ca10-48f9-9c7f-aa58f9778864	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Perda"}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:49:07.073
faef9953-16d5-42dd-b791-68bf8a6325d1	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PROPOSTA.	{"to": "PROPOSTA", "from": "PERDIDO", "lostReason": null}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:50:12.138
c4dfe9d9-a49e-4060-be9f-48cddbddf4f5	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-04 12:50:53.898
fc0fb903-5301-4b62-a786-4a2c3733cab3	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:51:24.089
c1c76a5d-b51a-44e6-a458-3ee647a1f2f8	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para NEGOCIACAO.	{"to": "NEGOCIACAO", "from": "PROPOSTA", "lostReason": null}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:51:34.714
b87339f0-6eb2-4b43-a148-30a9877e4b7a	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para NOVO.	{"to": "NOVO", "from": "NEGOCIACAO", "lostReason": null}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:51:42.016
9ff6ae0b-3a0e-49ce-b622-b7d6f2c0142c	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "NOVO", "lostReason": "perdido"}	\N	\N	\N	\N	Opportunity	0ffceb85-c905-4982-a939-929f6ec3e42b	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:56:11.671
724e1ac1-8184-49b7-85aa-7c90f789edad	CLIENT	OPPORTUNITY_CREATED	INFO	Oportunidade criada: Pre-contrato comercial.	{"quoteId": null, "clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "preContract": true}	\N	\N	\N	\N	Opportunity	c7ea761d-ab71-4b80-bc67-2ade3b98c523	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:56:25.856
4c5b9a48-af25-40c7-9fa5-309723356a4a	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "PROPOSTA", "lostReason": "teste"}	\N	\N	\N	\N	Opportunity	c7ea761d-ab71-4b80-bc67-2ade3b98c523	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:56:51.593
71213241-814d-40eb-916c-e8d8d5ec05ad	CLIENT	OPPORTUNITY_CREATED	INFO	Oportunidade criada: Transporte Teste.	{"quoteId": null, "clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "preContract": true}	\N	\N	\N	\N	Opportunity	92a22ddb-5a5e-42e2-9225-7d10f61535e2	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:57:14.658
6984307f-4215-4862-bbe7-21801df04f11	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 13:30:07.153
51a0dc34-f179-4a4b-87e6-6dfe5df92445	USER	USER_CREATED	INFO	Usuario criado: Tiago Piz.	{"role": "MARKETING", "email": "tiagopzt@teste.com"}	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 13:30:34.483
e5d2d357-ce0d-4f14-930e-1e409aedeb86	AUTH	LOGIN	INFO	Login realizado por tiagopzt@teste.com.	\N	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:30:50.063
b2ad3c65-3080-4009-b34c-1299b50d3d46	USER	USER_UPDATED	INFO	Senha atualizada por tiagopzt@teste.com.	{"mustChangePassword": false}	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:30:59.062
3650df9b-8993-4394-986d-76e84d45b817	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-04 13:32:46.974
b4579580-68af-4a8d-b6ab-bb90fdcf954f	AUTH	LOGIN	INFO	Login realizado por tiagopzt@teste.com.	\N	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:33:26.576
b908066a-4527-4750-a699-3b198bf8e773	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-04 13:36:04.673
b039036c-d4f4-4f94-ada9-2ddd660bc789	AUTH	LOGIN	INFO	Login realizado por tiagopzt@teste.com.	\N	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:36:25.978
c753dc0a-6c96-437c-8b72-d9948e2de966	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-04 13:37:20.307
d4e67a2c-2069-488e-97cc-74c56f231995	AUTH	LOGIN	INFO	Login realizado por tiagopzt@teste.com.	\N	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:41:19.352
80c59763-7571-4ee9-b908-085fd9ba0db8	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-04 13:52:00.677
9edd3592-48ed-4036-a85f-2c225606b7e3	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 13:52:19.371
e2541ddb-6cd7-4204-a0e6-8a76cb411e58	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 14:31:54.078
7188da08-b6f3-4c8b-96bb-ab7ab7b3b722	USER	USER_UPDATED	INFO	Usuario atualizado: Caroline Augusto Teste.	{"role": "ADMIN", "email": "admin@teste.com"}	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 15:01:06.041
fa62d563-7066-4521-a3fc-795c02bacf3b	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 15:01:42.694
340fc0d8-27a9-4e3c-bcb3-38f8f3ec482c	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-04 20:26:15.122
827fe889-b962-446b-872d-6f29a61361fe	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-04 20:27:16.864
5626c90d-3ece-4051-a049-a2a33b7f976f	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-04 20:27:29.202
06d5dce5-e4bc-4f52-b655-c2717fea3754	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 20:28:12.118
32fb5e54-89bc-427e-a25f-2b6ff23ecb58	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 20:35:52.495
219df977-09ad-4c81-9d94-56182525b779	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 14:11:15.495
5567f2cf-a215-40e9-8db9-563ca30d9b21	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:15:46.63
fbbaf524-83dd-4c4d-89c7-ff6e335bcd84	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:16:13.722
a8b5cef9-b9d2-4053-840f-34ec57584ce0	TICKET	TICKET_CREATED	INFO	Ticket criado: Ver com o cliente.	{"type": "COTACAO", "leadId": null, "status": "ABERTO", "quoteId": null, "clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "internalOnly": false, "opportunityId": null}	\N	\N	\N	\N	Ticket	9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:16:47.625
a8c73782-360f-46d4-9314-f842097b661f	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:16:55.808
94d4ce09-21ef-442e-a3b8-42ee797b9250	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-709081.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9", "propostaId": "962e8b33-ad6f-475c-86bb-46a2b7f2e011", "clientUserId": "c6128d55-5786-416b-b274-e87446203ce7"}	\N	\N	\N	\N	Proposta	962e8b33-ad6f-475c-86bb-46a2b7f2e011	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:17:54.78
26febd8e-f792-457b-aa8d-466c52dc7b2c	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 14:18:09.568
b767bad2-314f-4c2e-ad34-9e09a0236482	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:18:46.926
cabd0ec2-682b-49eb-a3ab-4aefb74f3fcf	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:23:25.592
49ed4c06-614d-470c-90b5-544a8144e214	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para AGUARDANDO_COMERCIAL.	{"status": "AGUARDANDO_COMERCIAL"}	\N	\N	\N	\N	Ticket	9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:23:36.824
b033476a-3ba2-4d72-89eb-c809aee815ff	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para APROVADO_GESTAO.	{"status": "APROVADO_GESTAO"}	\N	\N	\N	\N	Ticket	9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:23:42.136
55f3e8a7-41ae-48c5-ba11-4627cd3d7ac1	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para APROVADO_GESTAO.	{"status": "APROVADO_GESTAO"}	\N	\N	\N	\N	Ticket	9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:23:56.645
60f49881-e6d4-4b01-be42-8fc4e32523fc	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para REPROVADO.	{"status": "REPROVADO"}	\N	\N	\N	\N	Ticket	9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:24:02.034
e45dce16-b851-416d-82c7-e24910566403	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:24:15.408
e592c2f5-4df1-4edc-aa8f-f87c21184488	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-968962.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9", "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "clientUserId": "c6128d55-5786-416b-b274-e87446203ce7"}	\N	\N	\N	\N	Proposta	dabeef50-d015-4da6-988f-a96cfcfe4353	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:25:15.082
b062e54d-d456-45e0-9fa8-1179c545ea40	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 14:26:13.129
e1555745-8efe-4cdb-84a7-61a73fd33f64	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "fac0cfbc-3e00-4dc7-adbb-9987f4e8d275", "visibility": "PUBLICA_CLIENTE"}	\N	\N	\N	\N	ChatMessage	aaee388f-15df-4a3b-83ca-bbe8079a2644	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 14:27:03.81
5403caba-df2f-4f53-aacc-06fd4b6292b0	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:27:21.587
11cdbfe0-7e2b-4b43-9fff-2e40a224b5c2	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "fac0cfbc-3e00-4dc7-adbb-9987f4e8d275", "visibility": "PUBLICA_CLIENTE"}	\N	\N	\N	\N	ChatMessage	5bef161d-8039-423c-a857-940f503727f2	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:29:30.912
a0fb6b5d-bae3-440a-8050-64ce1ba60ac4	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 14:30:01.804
5e9e3f4e-3e9a-43af-9555-0bcacc0297f5	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:31:25.642
7bc0766d-7c6f-4597-9bf8-a4f4f71290d5	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:32:08.543
370b170b-819c-45d3-b3f4-1713b7f66ea9	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "fac0cfbc-3e00-4dc7-adbb-9987f4e8d275", "visibility": "GESTAO_COMERCIAL"}	\N	\N	\N	\N	ChatMessage	efa83c8d-29cb-4052-ad10-3f86509e864c	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:33:02.84
96ea1226-7388-4cbb-a5ad-230c9120cca5	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:33:38.515
96a5424b-1229-4c15-babd-60555678f4f8	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-968962.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9", "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "clientUserId": "c6128d55-5786-416b-b274-e87446203ce7"}	\N	\N	\N	\N	Proposta	dabeef50-d015-4da6-988f-a96cfcfe4353	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:33:54.023
f2442d54-a4e1-47b9-ab63-29a00b6e629d	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:34:10.447
3d8b19a8-9e08-469c-8bf5-0b1830b74eae	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 14:34:26.29
b498310e-d944-4b84-b24c-73336e25e5fc	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:35:00.282
650df476-de45-42a0-ab14-d7b5826234b6	AUTH	LOGIN	INFO	Login realizado por gestao@teste.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:35:46.139
c5e30048-9b09-444c-ba90-33e72724f313	TICKET	TICKET_STATUS_CHANGED	INFO	Status do ticket alterado para REPROVADO.	{"status": "REPROVADO"}	\N	\N	\N	\N	Ticket	9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 14:36:09.324
8e4b41d4-726a-4db1-ab82-870c4e4196dc	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:36:23.58
881ad8c0-0ab2-449d-9512-ccda887a3f9e	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:5a2b5c9b-4206-4068-bf73-91e94b414fb8.	{"entityId": "5a2b5c9b-4206-4068-bf73-91e94b414fb8", "entityType": "TICKET", "participantIds": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "c6128d55-5786-416b-b274-e87446203ce7"]}	\N	\N	\N	\N	Chat	54b49d97-af3f-4a6b-a4db-f102288bfbb7	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:40:29.656
abb3713b-dd65-40cb-8cef-0b0eea07c83c	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 14:40:48.115
192207da-e08f-45e2-af5a-4bd4df9d54b1	AUTH	LOGIN	INFO	Login realizado por boticario@teste.com.br.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 14:43:15.914
d6ab52b6-cdb0-4f43-8606-c9703e9c8849	AUTH	LOGIN	INFO	Login realizado por comercial@teste.com.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 14:43:28.561
adcb6404-e968-4940-803a-b784464aed19	AUTH	LOGIN	INFO	Login realizado por admin@teste.com.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 14:47:27.816
75c33774-1e9e-4d01-bfc7-7b9f3417eafd	USER	USER_UPDATED	INFO	Usuario atualizado: Tiago Piz.	{"role": "MARKETING", "email": "tiagopzt@teste.com"}	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:01:04.565
42246c83-4b15-4111-8174-b75868b3f80b	USER	USER_UPDATED	INFO	Usuario atualizado: maiara.	{"role": "COMERCIAL", "email": "maiara.comercial@pizzattolog.com.br"}	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:01:33.236
4140fce6-f713-4afa-8524-00b1ebb8e8a1	USER	USER_UPDATED	INFO	Usuario atualizado: Maiara Gonçalvez.	{"role": "COMERCIAL", "email": "maiara.comercial@pizzattolog.com.br"}	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:01:48.662
cc0c6292-aeec-4c9c-bbaf-8dac80fac575	USER	USER_UPDATED	INFO	Usuario atualizado: Natalia Santos.	{"role": "CLIENTE", "email": "nathalia.boticario@gmail.com"}	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:02:16.403
4a9570c6-bf0f-41ac-b85f-54950a6b027f	USER	USER_UPDATED	INFO	Usuario atualizado: Daiane Camila.	{"role": "GESTAO", "email": "daiane.camila@pizzattolog.com"}	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:02:40.171
0eeae643-1e16-4098-9f13-cbd0a7718118	USER	USER_UPDATED	INFO	Usuario atualizado: Caroline Augusto.	{"role": "ADMIN", "email": "caroline.augusto@pizzattolog.com.br"}	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:02:58.055
56bf125c-6879-4819-b914-153397fc99cc	USER	USER_CREATED	INFO	Usuario criado: Natura.	{"role": "CLIENTE", "email": "natura@natura.com"}	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:04:29.278
d27cde1c-69fb-4d6f-974d-94a6f6005367	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 15:05:14.848
8107eb54-1685-4a77-ad0e-d349a2506d7d	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:25:14.377
ef285a58-c96c-4af6-8322-8a54ae40868c	USER	USER_UPDATED	INFO	Senha atualizada por natura@natura.com.	{"mustChangePassword": false}	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:25:24.835
2d45fd54-4d38-4e79-98de-db9e20d53cf4	QUOTE	QUOTE_CREATED	INFO	Cotacao criada para Natura comestico.	{"clientId": "193da2cd-18a0-419d-9a27-91978619b1b8", "requestType": "Avulsa", "serviceType": "Seco"}	\N	\N	\N	\N	Quote	8d00b77b-915f-45fd-a2dc-a2fe5a95720e	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:27:34.381
4f568ac4-7d6c-4e62-b929-a78546f2b982	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:79eff664-aa1d-443c-ac81-efc90ee2c022.	{"entityId": "79eff664-aa1d-443c-ac81-efc90ee2c022", "entityType": "TICKET", "participantIds": ["f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"]}	\N	\N	\N	\N	Chat	4dbe6e98-a9d3-437d-aba4-62e42cce2541	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:27:51.32
732f14b1-9efe-4851-bb3e-cc008f2175af	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 17:29:00.056
cd88b77e-b960-4992-98fc-9b2d8bb36af8	QUOTE	QUOTE_RESPONDED	INFO	Proposta comercial enviada para cotacao.	{"price": 18900}	\N	\N	\N	\N	Quote	8d00b77b-915f-45fd-a2dc-a2fe5a95720e	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 17:31:02.075
cfc051a0-ddb3-4f9c-b76c-0e2b3b463077	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:32:32.493
317bc496-fca4-481b-a318-75763c14ee9f	TICKET	TICKET_RESPONDED	INFO	Resposta registrada no ticket Nova cotacao: Seco.	{"isInternal": false, "nextStatus": "AGUARDANDO_COMERCIAL", "senderType": "CLIENTE"}	\N	\N	\N	\N	Ticket	79eff664-aa1d-443c-ac81-efc90ee2c022	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:33:04.529
9e57df19-8da9-43a6-9a76-1944fd136e93	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 17:33:31.494
31c28870-d0ed-40ca-af98-6aa677e3a8aa	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-043725.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "79eff664-aa1d-443c-ac81-efc90ee2c022", "propostaId": "b1b1c15f-dda9-42fc-8544-3f5e14f94d67", "clientUserId": "f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"}	\N	\N	\N	\N	Proposta	b1b1c15f-dda9-42fc-8544-3f5e14f94d67	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 17:35:01.852
232b00fc-908c-4c81-9017-aa934e70848e	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:35:16.05
a90cb4e9-ae1f-4acf-8c6f-9e1ff02a80d4	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 17:36:12.12
7c1665fb-ac86-46ef-8e74-53605e49c4eb	AUTH	LOGIN	INFO	Login realizado por daiane.camila@pizzattolog.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 17:36:47.207
ec109dea-0539-4c4d-95f0-aa1402b4374f	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 17:37:40.413
e6ad89d2-cc0b-4866-b269-cd152157f7f1	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:6be6020b-05e2-4bee-a931-76247207b097.	{"entityId": "6be6020b-05e2-4bee-a931-76247207b097", "entityType": "TICKET", "participantIds": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "e586d272-b2df-440c-9a27-5a96c07f3f36", "c6128d55-5786-416b-b274-e87446203ce7"]}	\N	\N	\N	\N	Chat	e05d559b-982b-4664-a3bf-d6fc4b367162	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-05 17:41:23.253
ca44c86e-a7dc-40fb-a0e4-a9e99bfa11f8	AUTH	LOGIN	INFO	Login realizado por daiane.camila@pizzattolog.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-05 18:28:51.947
c8b70397-873a-46ab-b6bc-1b8e795b9fe1	AUTH	LOGIN	INFO	Login realizado por nathalia.boticario@gmail.com.	\N	\N	\N	\N	\N	User	c6128d55-5786-416b-b274-e87446203ce7	t	c6128d55-5786-416b-b274-e87446203ce7	2026-05-05 18:29:47.084
1c763208-9f2b-478e-b5b0-698459609a9f	AUTH	LOGIN	INFO	Login realizado por tiagopzt@teste.com.	\N	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-05 18:38:06.115
94d00a5c-3f69-4666-bcbf-598b074e8495	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 18:45:05.878
44bac4f0-b0f5-4f32-a0cf-fa7a4b1cbb0f	AUTH	LOGIN	INFO	Login realizado por tiagopzt@teste.com.	\N	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-05 18:45:49.383
612e1302-4b60-43b3-844a-ba752c0c3e2e	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 18:48:10.222
cb712100-845a-4120-a123-e20ad5737e11	AUTH	LOGIN	INFO	Login realizado por tiagopzt@teste.com.	\N	\N	\N	\N	\N	User	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	t	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-05 18:48:53.639
08088034-f366-48ef-a305-4c525c915d5e	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 19:04:34.139
556f3752-47f0-4a03-bbc0-8a9d6645878c	AUTH	LOGIN	INFO	Login realizado por caroline.augusto@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 19:15:57.376
4c446d1f-42aa-4ed4-9c8f-c25d6b97339b	QUOTE	QUOTE_DELETED	INFO	Cotacao COT-408826 excluida.	{"quoteId": "8d00b77b-915f-45fd-a2dc-a2fe5a95720e", "clientId": "193da2cd-18a0-419d-9a27-91978619b1b8", "quoteCode": "COT-408826", "clientName": "Natura comestico", "clientEmail": "natura@natura.com", "serviceType": "Seco", "previousStatus": "ANSWERED"}	\N	\N	\N	\N	Quote	8d00b77b-915f-45fd-a2dc-a2fe5a95720e	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 19:16:12.88
f44b882f-271f-4dc7-b2df-9b5f703d604d	QUOTE	QUOTE_DELETED	INFO	Cotacao COT-494363 excluida.	{"quoteId": "562ac288-b56c-4ed5-9557-6541cb9303cc", "clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "quoteCode": "COT-494363", "clientName": "Boticário", "clientEmail": "nathalia.boticario@gmail.com", "serviceType": "Fracionado", "previousStatus": "ANSWERED"}	\N	\N	\N	\N	Quote	562ac288-b56c-4ed5-9557-6541cb9303cc	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 19:16:18.568
9f30636e-80fb-4993-b663-f18aedd4c302	QUOTE	QUOTE_DELETED	INFO	Cotacao COT-307124 excluida.	{"quoteId": "8e786a4c-3ab2-4150-8d8e-949320c8c1c8", "clientId": "1791e0f4-2187-4c2c-a4e1-4e8e404e8973", "quoteCode": "COT-307124", "clientName": "Boticário", "clientEmail": "nathalia.boticario@gmail.com", "serviceType": "Fracionado", "previousStatus": "APPROVED"}	\N	\N	\N	\N	Quote	8e786a4c-3ab2-4150-8d8e-949320c8c1c8	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 19:16:23.855
fadd1830-335a-460d-889d-e137e9df081a	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:79eff664-aa1d-443c-ac81-efc90ee2c022.	{"entityId": "79eff664-aa1d-443c-ac81-efc90ee2c022", "entityType": "TICKET", "participantIds": ["15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9", "f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"]}	\N	\N	\N	\N	Chat	61fe1800-0d97-4bf1-b757-93e43bae2d8f	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 19:16:30.927
9db1fae9-79b6-4a55-b75f-f4b4add2ae83	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 11:57:30.437
1d329958-f978-4107-8531-8606d2fb5bbf	QUOTE	QUOTE_CREATED	INFO	Cotacao criada para Natura comestico.	{"clientId": "193da2cd-18a0-419d-9a27-91978619b1b8", "requestType": "Contrato", "serviceType": "Fracionado"}	\N	\N	\N	\N	Quote	a61e1a22-79d9-427f-af58-9a5d6585b029	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:06:24.355
61434b44-2aee-4e69-acd3-813b7dece009	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:97313331-1843-4534-a048-0d3cd16ef39c.	{"entityId": "97313331-1843-4534-a048-0d3cd16ef39c", "entityType": "TICKET", "participantIds": ["f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"]}	\N	\N	\N	\N	Chat	e7e1ba89-2e44-450e-b477-b442bee9a6ad	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:06:38.911
381d2b38-b754-4109-9851-a3e987bd8059	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:07:51.116
2fa50fd4-f23d-4467-9138-094b59a6c211	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-469329.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "97313331-1843-4534-a048-0d3cd16ef39c", "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b", "clientUserId": "f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"}	\N	\N	\N	\N	Proposta	f1a40751-1922-4e47-b024-2a476aae131b	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:14:26.014
658d5038-5724-415e-9508-178c00456690	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:14:51.473
62b57dbb-5938-4d88-bca6-50ba13081a35	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "6cf70dd3-0fb1-4137-89c8-338159bfdb39", "visibility": "PUBLICA_CLIENTE"}	\N	\N	\N	\N	ChatMessage	f343c1d6-fdb3-4513-8f13-c02209a4300c	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:23:06.654
99292cde-b0ce-4c52-8dec-9995281dfcfd	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "6cf70dd3-0fb1-4137-89c8-338159bfdb39", "visibility": "PUBLICA_CLIENTE"}	\N	\N	\N	\N	ChatMessage	3d7b4af3-d5bb-4bfd-ba96-741b645e01c7	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:23:12.667
5afa613c-5e68-4dc2-bf19-53a8a414afd9	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:23:51.895
5612a231-2159-43a2-8272-d6006fa80559	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-469329.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "97313331-1843-4534-a048-0d3cd16ef39c", "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b", "clientUserId": "f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"}	\N	\N	\N	\N	Proposta	f1a40751-1922-4e47-b024-2a476aae131b	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:27:03.358
3e4fe5f1-649f-4bb5-b398-b7c10c08e1bb	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:27:33.295
4111f3a2-becb-4b45-8e18-45db5827cd5a	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:27:57.41
a17b2e33-b911-4ef4-b18e-59c8812646b0	AUTH	LOGIN	INFO	Login realizado por daiane.camila@pizzattolog.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:32:21.674
45270296-3e7c-4ec1-8f2e-b5cdfc45b282	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "GANHO", "lostReason": "Motivo nao informado."}	\N	\N	\N	\N	Opportunity	d2a0705b-b10b-41f1-b6b0-612d6c5b53c9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:36:24.497
26a19177-0dd3-4d91-91d7-c511cdb06ed4	CLIENT	OPPORTUNITY_STAGE_CHANGED	INFO	Etapa da oportunidade alterada para PERDIDO.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Motivo nao informado."}	\N	\N	\N	\N	Opportunity	d2a0705b-b10b-41f1-b6b0-612d6c5b53c9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:36:30.535
9d90e1d1-4332-4cad-b736-234ded4400dd	CLIENT	CUSTOM	INFO	Oportunidade editada: Cotacao - Seco.	{"changedFields": ["observacoes do pre-contrato"]}	\N	\N	\N	\N	Opportunity	d2a0705b-b10b-41f1-b6b0-612d6c5b53c9	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:37:26.622
da14eb04-ae3c-4961-975d-a1e0f22178be	AUTH	LOGIN	INFO	Login realizado por daiane.camila@pizzattolog.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:39:17.383
cc4f717e-530f-452e-b682-084cbc478381	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:39:38.448
062c78b9-a914-4752-b69d-48049c17dd8c	QUOTE	QUOTE_DELETED	INFO	Cotacao COT-549999 excluida.	{"quoteId": "a61e1a22-79d9-427f-af58-9a5d6585b029", "clientId": "193da2cd-18a0-419d-9a27-91978619b1b8", "quoteCode": "COT-549999", "clientName": "Natura comestico", "clientEmail": "natura@natura.com", "serviceType": "Fracionado", "previousStatus": "ANSWERED"}	\N	\N	\N	\N	Quote	a61e1a22-79d9-427f-af58-9a5d6585b029	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:40:13.083
8a6da5bf-f675-48e8-b313-d60f6ed1853c	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:54:33.342
d21512f9-b333-47d7-96ad-b7f31918e153	QUOTE	QUOTE_CREATED	INFO	Cotacao criada para Natura comestico.	{"clientId": "193da2cd-18a0-419d-9a27-91978619b1b8", "requestType": "Contrato", "serviceType": "Fracionado"}	\N	\N	\N	\N	Quote	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.816
ac16b4dc-c575-4b6a-85cf-72e33c00fc1f	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:55:58.556
8b03ac5d-fac9-4bc4-8590-f45ddf12d29f	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:25ccd7f4-a4f4-43c1-a248-f2d86cde6287.	{"entityId": "25ccd7f4-a4f4-43c1-a248-f2d86cde6287", "entityType": "TICKET", "participantIds": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"]}	\N	\N	\N	\N	Chat	5a37c310-2333-4cfb-b971-10fc26e236e1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:56:04.526
5e520df4-299e-4519-8ff7-fa15ddd3e26b	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-798640.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "25ccd7f4-a4f4-43c1-a248-f2d86cde6287", "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "clientUserId": "f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"}	\N	\N	\N	\N	Proposta	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:03:13.998
929e7ed6-f425-4929-80d0-54dd348766d1	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:03:29.331
b2113af5-f2b9-4150-9196-6926c67ff3bd	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "ff29cf4e-befb-4262-98f2-cf3a8bff5ced", "visibility": "PUBLICA_CLIENTE"}	\N	\N	\N	\N	ChatMessage	2e8c7225-3133-4779-88e1-8eca1b2d82b7	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:05:30.015
ccedf57d-241d-4bb2-8924-08e21fc25e52	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:06:00.92
9aa37f2e-41a7-4995-8960-32e5588f79de	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "ff29cf4e-befb-4262-98f2-cf3a8bff5ced", "visibility": "PUBLICA_CLIENTE"}	\N	\N	\N	\N	ChatMessage	73e4c417-b449-4da2-9d1c-184b4d634ccb	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:08:18.279
41972801-a24c-4ba1-89bd-4db50d0102ed	TICKET	PROPOSAL_SENT	INFO	Proposta enviada ao cliente: PROP-798640.	{"status": "ENVIADA_AO_CLIENTE", "ticketId": "25ccd7f4-a4f4-43c1-a248-f2d86cde6287", "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "clientUserId": "f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"}	\N	\N	\N	\N	Proposta	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:09:08.582
2e7c0e18-2f89-4b7e-b733-0131d638d77e	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:09:22.038
dc6fe3cd-6c8a-440c-8989-f5542966b381	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:10:05.397
a469f9d5-ff6d-43d0-ba78-17dde980ac09	AUTH	LOGIN	INFO	Login realizado por daiane.camila@pizzattolog.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 13:12:31.84
17aa0d45-3eef-41ca-b89e-0881a72923b8	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:13:16.028
6c21dc8c-1555-4af7-8f4e-c5ff3fa54845	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:13:46.428
2d6082ee-5ec3-4e65-8cef-79ebfddb0022	AUTH	LOGIN	INFO	Login realizado por caroline.augusto@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-06 13:35:44.564
6b7fac37-a4fa-4a61-a859-f9ab8a2561a0	AUTH	LOGIN	INFO	Login realizado por caroline.augusto@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-06 13:36:08.9
8552b26d-f654-40d1-a11f-1ed25cee7e46	AUTH	LOGIN	INFO	Login realizado por natura@natura.com.	\N	\N	\N	\N	\N	User	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:52:13.431
f0a9de96-2761-4752-96a7-9f9fcffbb30f	CHAT	CHAT_MESSAGE_SENT	INFO	Mensagem enviada no chat.	{"chatId": "ff29cf4e-befb-4262-98f2-cf3a8bff5ced", "visibility": "PUBLICA_CLIENTE"}	\N	\N	\N	\N	ChatMessage	82099d27-b0fe-4be7-807e-c8317a7fa3fa	t	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:56:21.89
de99350b-2a80-4e06-813d-621e485f02b1	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:56:34.167
144f60cc-37c5-48b6-a0b6-702cea1f9167	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:98d83c44-5696-4062-ac34-12817e56a431.	{"entityId": "98d83c44-5696-4062-ac34-12817e56a431", "entityType": "TICKET", "participantIds": ["aa44b21d-a846-4615-82a0-8a99f93e07d1"]}	\N	\N	\N	\N	Chat	6f839019-6b27-4668-a9b4-ad047b7ae317	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 16:59:00.179
8f02037e-b25a-4c12-b508-04db2cf37dec	USER	USER_CREATED	INFO	Usuario criado: Lucas.	{"role": "CLIENTE", "email": "romana@gmaill.com"}	\N	\N	\N	\N	User	f953bbea-661a-427f-ae67-04481069ab1a	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:08:42.412
c8e1cf4a-d1d3-4e79-95b6-d4e575b14871	CLIENT	CLIENT_UPDATED	INFO	Cliente atualizado: Transporte Romana.	{"changedFields": ["status"]}	\N	\N	\N	\N	Client	bafee647-b869-4fbe-8765-b10135f12c4d	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:08:54.644
24e827dc-9fae-4d83-b53a-ae312bbb090f	CLIENT	CUSTOM	INFO	Solicitacao de exclusao criada para Transporte Romana.	{"clientId": "bafee647-b869-4fbe-8765-b10135f12c4d", "clientName": "Transporte Romana"}	\N	\N	\N	\N	ClientDeletionRequest	f6bd5d80-fb35-42c6-a1c9-a752e7bb0d39	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:18:31.571
09189dae-25f9-4686-9d1a-d791cb25ca20	AUTH	LOGIN	INFO	Login realizado por daiane.camila@pizzattolog.com.	\N	\N	\N	\N	\N	User	e586d272-b2df-440c-9a27-5a96c07f3f36	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 17:46:30.177
9066cab8-9629-4852-a8f8-ff4675b7c88f	CLIENT	CUSTOM	INFO	Exclusao aprovada para Transporte Romana.	{"clientId": "bafee647-b869-4fbe-8765-b10135f12c4d", "decision": "APPROVE", "clientEmail": "romana@gmaill.com"}	\N	\N	\N	\N	ClientDeletionRequest	f6bd5d80-fb35-42c6-a1c9-a752e7bb0d39	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 17:52:25.678
d20e32e4-7dc8-45e1-8e11-7c0bc9b764b0	USER	USER_DELETED	INFO	Usuario removido apos aprovacao da Gestao: romana@gmaill.com.	{"clientId": "bafee647-b869-4fbe-8765-b10135f12c4d", "clientName": "Transporte Romana"}	\N	\N	\N	\N	User	f953bbea-661a-427f-ae67-04481069ab1a	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 17:52:25.687
cc577c6d-b0a2-42b7-a417-2e0f523cca88	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:52:56.702
f9de7cc0-0a5d-4cb4-ae2c-3ad99036ec97	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:98d83c44-5696-4062-ac34-12817e56a431.	{"entityId": "98d83c44-5696-4062-ac34-12817e56a431", "entityType": "TICKET", "participantIds": ["aa44b21d-a846-4615-82a0-8a99f93e07d1"]}	\N	\N	\N	\N	Chat	9aef5655-ce96-4dc5-b474-4e791da3311c	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:54:26.194
6463d351-1083-4747-8ae9-f00b875b870d	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:8006ba26-2dee-41ae-b954-0997f5c88b66.	{"entityId": "8006ba26-2dee-41ae-b954-0997f5c88b66", "entityType": "TICKET", "participantIds": ["aa44b21d-a846-4615-82a0-8a99f93e07d1"]}	\N	\N	\N	\N	Chat	7e66fc6a-3409-4591-a5ab-813b9a0af6fc	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:55:01.23
8ef19fff-d5d6-4c0d-a24e-d734a3abce1b	USER	USER_CREATED	INFO	Usuario criado: Lucas Sousa.	{"role": "CLIENTE", "email": "friboi@gmail.com"}	\N	\N	\N	\N	User	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:56:13.872
86b6b725-9d70-4412-a031-756e32cb1df4	AUTH	LOGIN	INFO	Login realizado por friboi@gmail.com.	\N	\N	\N	\N	\N	User	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	t	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:00:36.263
d934e329-a81b-455d-aae5-c8594385161f	USER	USER_UPDATED	INFO	Senha atualizada por friboi@gmail.com.	{"mustChangePassword": false}	\N	\N	\N	\N	User	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	t	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:00:46.357
5ef74517-25c4-4d02-b467-4d14fe5ae753	QUOTE	QUOTE_CREATED	INFO	Cotacao criada para 123456.	{"clientId": "85a7434d-1b74-40f3-a19b-1f3752ba5ad8", "requestType": "Avulsa", "serviceType": "Fracionado"}	\N	\N	\N	\N	Quote	985d9a13-3fe1-49d1-89ff-b969fc5241a3	t	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.272
50f0275c-edd1-4a37-a174-ef93297881a7	AUTH	LOGIN	INFO	Login realizado por maiara.comercial@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 18:01:54.922
a686bb86-579f-43ea-ac93-404f30d12b2a	CHAT	CHAT_CREATED	INFO	Chat criado para TICKET:1e1715a2-d797-40db-80ee-16f2ad89079a.	{"entityId": "1e1715a2-d797-40db-80ee-16f2ad89079a", "entityType": "TICKET", "participantIds": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b"]}	\N	\N	\N	\N	Chat	8941bbb5-450b-4d8f-956e-0e03c816d721	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 18:01:57.868
9389df7f-1b1c-4cff-9b25-abd0a9fef034	CLIENT	CLIENT_UPDATED	INFO	Cliente atualizado: 123456.	{"changedFields": ["empresa"]}	\N	\N	\N	\N	Client	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 18:52:25.487
efe52bfe-c431-44ff-a328-2b879c7d379b	AUTH	LOGIN	INFO	Login realizado por caroline.augusto@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-06 18:54:03.398
52b53f7b-fffa-4351-b1f2-43f0606917f0	AUTH	LOGIN	INFO	Login realizado por caroline.augusto@pizzattolog.com.br.	\N	\N	\N	\N	\N	User	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-07 17:31:58.78
\.


--
-- Data for Name: Chat; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Chat" (id, "entityType", "entityId", title, "leadId", "clientId", "quoteId", "propostaId", "ticketId", "createdById", "createdAt", "updatedAt") FROM stdin;
5a37c310-2333-4cfb-b971-10fc26e236e1	TICKET	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Nova cotacao: Fracionado	\N	193da2cd-18a0-419d-9a27-91978619b1b8	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	\N	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 12:56:04.519	2026-05-06 12:56:04.519
ff29cf4e-befb-4262-98f2-cf3a8bff5ced	PROPOSTA	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	PROP-798640	\N	193da2cd-18a0-419d-9a27-91978619b1b8	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:03:13.978	2026-05-06 13:56:21.872
7e66fc6a-3409-4591-a5ab-813b9a0af6fc	TICKET	8006ba26-2dee-41ae-b954-0997f5c88b66	Novo lead: Lucas Sousa	d785f7ab-5dc3-49cd-9b86-bfb75035b5fa	\N	\N	\N	8006ba26-2dee-41ae-b954-0997f5c88b66	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:55:01.22	2026-05-06 17:55:01.22
8941bbb5-450b-4d8f-956e-0e03c816d721	TICKET	1e1715a2-d797-40db-80ee-16f2ad89079a	Nova cotacao: Fracionado	\N	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	985d9a13-3fe1-49d1-89ff-b969fc5241a3	\N	1e1715a2-d797-40db-80ee-16f2ad89079a	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 18:01:57.858	2026-05-06 18:01:57.858
\.


--
-- Data for Name: ChatMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatMessage" (id, "chatId", "authorId", content, visibility, "editedAt", "deletedAt", "createdAt", "updatedAt") FROM stdin;
96d2f316-7c1b-49e9-9caa-57b0981dc322	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	aa44b21d-a846-4615-82a0-8a99f93e07d1	O Comercial enviou uma proposta para analise do cliente.	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:03:13.986	2026-05-06 13:03:13.986
83fc3193-c213-4923-9277-4106d0b38164	5a37c310-2333-4cfb-b971-10fc26e236e1	aa44b21d-a846-4615-82a0-8a99f93e07d1	O Comercial enviou uma proposta para analise do cliente.	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:03:13.988	2026-05-06 13:03:13.988
2e8c7225-3133-4779-88e1-8eca1b2d82b7	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	Bom dia Maiara tudo bem ? Conversei com meu comercial aqui e o preço está a cima da tabela frete, pode revisar conforme falamos no email.\n\nFico no aguardo!	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:05:30.009	2026-05-06 13:05:30.009
bc3fa604-8259-43cd-8d22-b8c696ba2f97	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	O cliente solicitou ajuste na proposta: Ajuste conforme email!	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:05:47.084	2026-05-06 13:05:47.084
e5ae9c6c-99ae-417c-9c8a-8d9163ee6ac0	5a37c310-2333-4cfb-b971-10fc26e236e1	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	O cliente solicitou ajuste na proposta: Ajuste conforme email!	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:05:47.085	2026-05-06 13:05:47.085
73e4c417-b449-4da2-9d1c-184b4d634ccb	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	aa44b21d-a846-4615-82a0-8a99f93e07d1	Bom dia Natura, iremos validar conforme! Att	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:08:18.272	2026-05-06 13:08:18.272
72218e30-917b-4a1b-9ca3-684b80a499cd	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	aa44b21d-a846-4615-82a0-8a99f93e07d1	O Comercial enviou uma proposta para analise do cliente.	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:09:08.569	2026-05-06 13:09:08.569
1eba4668-09d0-4ccc-983a-a6f44c8a58b6	5a37c310-2333-4cfb-b971-10fc26e236e1	aa44b21d-a846-4615-82a0-8a99f93e07d1	O Comercial enviou uma proposta para analise do cliente.	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:09:08.571	2026-05-06 13:09:08.571
e4a67903-1a16-403b-89b3-47083a24ef9a	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	O cliente aprovou a proposta.	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:09:51.262	2026-05-06 13:09:51.262
887772f7-a049-4a84-b76d-0e1ae881b86a	5a37c310-2333-4cfb-b971-10fc26e236e1	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	O cliente aprovou a proposta.	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:09:51.265	2026-05-06 13:09:51.265
5e86690e-b0be-49f3-87b1-c9fde0339c77	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	aa44b21d-a846-4615-82a0-8a99f93e07d1	A proposta PROP-798640 foi enviada para aprovacao da Gestao.	GESTAO_COMERCIAL	\N	\N	2026-05-06 13:12:17.227	2026-05-06 13:12:17.227
be4ce4ca-7f9e-413f-8d57-bfa3729fd174	5a37c310-2333-4cfb-b971-10fc26e236e1	aa44b21d-a846-4615-82a0-8a99f93e07d1	A proposta PROP-798640 foi enviada para aprovacao da Gestao.	GESTAO_COMERCIAL	\N	\N	2026-05-06 13:12:17.229	2026-05-06 13:12:17.229
82099d27-b0fe-4be7-807e-c8317a7fa3fa	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	Olá	PUBLICA_CLIENTE	\N	\N	2026-05-06 13:56:21.872	2026-05-06 13:56:21.872
\.


--
-- Data for Name: ChatMessageRecipient; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatMessageRecipient" (id, "messageId", "userId") FROM stdin;
\.


--
-- Data for Name: ChatParticipant; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ChatParticipant" (id, "chatId", "userId", "canRead", "canWrite", "createdAt", "updatedAt", "lastReadAt") FROM stdin;
6626c684-72a8-44d9-8225-c641ac46b951	8941bbb5-450b-4d8f-956e-0e03c816d721	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	t	2026-05-06 18:01:57.858	2026-05-06 18:02:09.743	2026-05-06 18:02:09.742
734107ec-077f-4f93-9caa-ee3790ef3efa	8941bbb5-450b-4d8f-956e-0e03c816d721	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	t	2026-05-06 18:54:09.866	2026-05-07 17:32:41.69	2026-05-07 17:32:41.689
bb45f62a-5f28-4c55-aa75-a16f18d651fd	5a37c310-2333-4cfb-b971-10fc26e236e1	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	t	t	2026-05-06 13:12:17.225	2026-05-07 17:32:43.12	2026-05-07 17:32:43.12
3e2d83e4-93c5-4bce-b5d5-272818b6eb06	5a37c310-2333-4cfb-b971-10fc26e236e1	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	t	2026-05-06 12:56:04.519	2026-05-06 17:10:29.441	2026-05-06 13:56:07.053
1b883710-0636-44de-8aa7-6e99d09fcc12	5a37c310-2333-4cfb-b971-10fc26e236e1	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	t	2026-05-06 12:56:04.519	2026-05-06 17:10:29.73	2026-05-06 17:10:29.728
f2e23e5b-0a4c-444d-82b2-957acfd325d8	5a37c310-2333-4cfb-b971-10fc26e236e1	e586d272-b2df-440c-9a27-5a96c07f3f36	t	t	2026-05-06 13:12:17.223	2026-05-06 17:47:48.858	2026-05-06 17:47:48.857
cdd96442-8dcf-4794-b81c-cbba7bfa900d	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	t	t	2026-05-06 13:03:13.978	2026-05-06 13:56:21.884	2026-05-06 13:56:21.872
76809b0c-1d79-423c-9865-03613ec9f224	ff29cf4e-befb-4262-98f2-cf3a8bff5ced	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	t	2026-05-06 13:03:13.978	2026-05-06 13:57:22.94	2026-05-06 13:57:22.939
bf66d89f-a50a-41a0-ade4-d4079daeec96	7e66fc6a-3409-4591-a5ab-813b9a0af6fc	aa44b21d-a846-4615-82a0-8a99f93e07d1	t	t	2026-05-06 17:55:01.22	2026-05-06 18:03:20.735	2026-05-06 18:03:20.734
c67433af-33e4-4038-afc5-536cb41d188a	8941bbb5-450b-4d8f-956e-0e03c816d721	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	t	t	2026-05-06 18:01:57.858	2026-05-06 18:54:09.887	\N
\.


--
-- Data for Name: Client; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Client" (id, "userId", document, phone, "companyName", "createdAt", "updatedAt", "internalOwnerId", notes, segment, status) FROM stdin;
1791e0f4-2187-4c2c-a4e1-4e8e404e8973	c6128d55-5786-416b-b274-e87446203ce7	23.331.263/0001-89	41988888889	Boticário	2026-04-29 15:23:31.079	2026-05-05 15:02:16.384	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Cosmético	ATIVO
193da2cd-18a0-419d-9a27-91978619b1b8	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	74.795.207/0001-36	41 97787888	Natura comestico	2026-05-05 15:04:29.267	2026-05-05 15:04:29.267	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Coméstico	ATIVO
85a7434d-1b74-40f3-a19b-1f3752ba5ad8	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	71.934.772/0001-49	41 66666666666666	Friboi	2026-05-06 17:56:13.863	2026-05-06 18:52:25.457	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Carne	ATIVO
\.


--
-- Data for Name: ClientDeletionRequest; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."ClientDeletionRequest" (id, "clientId", "requestedById", "approvedById", status, reason, "managementResponse", "clientNameSnapshot", "clientEmailSnapshot", "createdAt", "updatedAt", "decidedAt") FROM stdin;
f6bd5d80-fb35-42c6-a1c9-a752e7bb0d39	\N	aa44b21d-a846-4615-82a0-8a99f93e07d1	e586d272-b2df-440c-9a27-5a96c07f3f36	APROVADA	Cadastro incorreto!	Ok!	Transporte Romana	romana@gmaill.com	2026-05-06 17:18:31.552	2026-05-06 17:52:25.62	2026-05-06 17:52:25.6
\.


--
-- Data for Name: Lead; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Lead" (id, name, email, phone, company, source, status, notes, "normalizedEmail", "normalizedPhone", channel, "sourcePhone", "externalMessageId", "externalContactId", metadata, "rawPayload", "lastInteractionAt", "createdById", "updatedById", "createdAt", "updatedAt") FROM stdin;
d785f7ab-5dc3-49cd-9b86-bfb75035b5fa	Lucas Sousa	friboi@gmail.com	11 9999999	Friboi	site	new	\N	friboi@gmail.com	119999999	\N	\N	\N	\N	\N	\N	\N	aa44b21d-a846-4615-82a0-8a99f93e07d1	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:54:16.166	2026-05-06 17:54:16.166
\.


--
-- Data for Name: LeadImportJob; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LeadImportJob" (id, "fileName", "sourceFileType", "totalRows", "successCount", "ignoredCount", "failureCount", status, summary, "createdById", "createdAt", "updatedAt", "completedAt") FROM stdin;
\.


--
-- Data for Name: LeadImportRowResult; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LeadImportRowResult" (id, "jobId", "rowNumber", status, reason, "rawData", "leadId", "createdAt") FROM stdin;
\.


--
-- Data for Name: LeadTimelineEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LeadTimelineEvent" (id, "leadId", type, title, description, metadata, "createdById", "createdAt", "updatedAt") FROM stdin;
654658b5-9f67-49eb-9353-29fd187cab1c	d785f7ab-5dc3-49cd-9b86-bfb75035b5fa	CREATED_MANUAL	Lead criado manualmente	Lead cadastrado manualmente no CRM.	\N	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:54:16.166	2026-05-06 17:54:16.166
\.


--
-- Data for Name: LogEmail; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."LogEmail" (id, "ticketId", "propostaId", "notificationId", "userId", "emailDestino", assunto, resumo, template, status, provedor, "idMensagemProvedor", "mensagemErro", "enviadoEm", "createdAt") FROM stdin;
814d049b-66e8-4e06-aee8-f40054e1a7e0	\N	\N	6d6a1714-4645-4790-9420-0ae8b76b340d	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	natura@natura.com	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 12:14:25.993
f27dadf6-76ed-45d0-87a3-06ac26a699be	\N	\N	a5269bea-19d2-4e9a-b7f7-4b9b13948677	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 12:27:43.869
f390d2fc-5231-4c89-8abc-d781e727edcf	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	01712677-9432-43ec-ab0b-502a4999486c	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Cliente solicitou ajuste na proposta	O cliente solicitou ajuste na proposta. Acesse o ticket para revisar.	CLIENTE_SOLICITOU_AJUSTE_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 13:05:47.09
523b787c-7601-4f06-b267-2a4fa26b940e	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	fdbbf685-0066-4ac9-acd3-eca1a8f85580	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	GESTAO_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 13:12:58.623
eef8c62c-71a8-4b38-a20d-edae6ea50b9a	\N	\N	cd62cef2-6244-40a7-b45a-36f57d7ef791	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 12:29:06.273
8d29a403-b973-4fb7-acc5-86ed8f799c4a	\N	\N	14c62d60-f1f1-4e73-8b54-70fd6a8bdbcb	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 12:33:12.953
40ae78ee-bc21-4320-93b7-bb9ad58982a0	\N	\N	49874be9-06ef-42bc-b78d-047332d57bce	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	GESTAO_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 12:36:33.989
3cf2d273-449d-4686-b312-780cefc9f9d5	\N	\N	6b39ae4c-d32d-46fa-8740-3e18619cb53f	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 17:21:35.146
f215d74d-99b5-4d53-92ed-ddd82f1a2d3c	\N	\N	16cc64ea-8885-4992-90a4-3a48ccf7ca97	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 17:26:20.01
e10da9eb-4918-494c-ac6a-00ed141a5baa	\N	\N	15441b73-f0ba-43c4-91e8-e1169367522c	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 12:57:34.243
386c1756-7809-4309-9eb3-fb72479511e8	\N	\N	3c3c277d-70d2-4d3f-885c-76ef50923152	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 13:00:01.979
776ab3f4-d87e-4f7e-825d-56dae3c92ef7	\N	\N	456265e5-d4d2-4cba-aaee-8cc54bb3b97a	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Gestao solicitou ajuste na proposta	A Gestao solicitou ajuste na proposta. O retorno foi enviado ao Comercial.	GESTAO_SOLICITOU_AJUSTE_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 13:01:17.587
55876084-fb0b-4dfa-bbdb-cd4c80f2c953	\N	\N	74197736-b066-436b-9a29-edf748ce298c	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 13:02:08.062
38f1a67a-f907-496f-85ed-bae08c7f7018	\N	\N	fbaa1811-5e72-418a-9b41-6cfb1690b955	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Cliente solicitou ajuste na proposta	O cliente solicitou ajuste na proposta. Acesse o ticket para revisar.	CLIENTE_SOLICITOU_AJUSTE_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 12:23:37.335
eb793d37-5378-4dfe-831b-12e835f4dbd4	\N	\N	ab5f187d-5b2a-44b6-9c72-c665d5791c84	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	GESTAO_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 12:39:27.16
9c68cb5c-d210-41f0-896a-bbca6543f144	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	5d02a4ab-1e7e-43b3-b038-837e9c32913d	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	natura@natura.com	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 13:09:08.575
5438bc90-d5c7-446e-bbec-67aab954a38f	\N	\N	6a17a9b5-c0ce-450f-946b-9f31b25873b4	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-29 17:32:35.461
9b2daf82-ba0d-415b-b9ac-9f5fe52fa7fc	\N	\N	dc6449e1-6f9f-4e0e-81ec-423e8c2a4983	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-29 17:33:14.389
da6af3ef-a09b-49c7-ba4c-93261034bef2	\N	\N	af7ff1b0-0c4a-47cd-ba69-3ee43f369e33	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Gestao solicitou ajuste na proposta	A Gestao solicitou ajuste na proposta. O retorno foi enviado ao Comercial.	GESTAO_SOLICITOU_AJUSTE_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-29 17:48:58.139
b8659b56-3b29-4e98-b5c3-359321e79434	\N	\N	4538b499-ab6b-4497-a095-60618eeb3b3d	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	natura@natura.com	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 17:35:01.829
c7de3bdf-b9bf-4050-adbd-83ed680aa7ea	\N	\N	c01498a3-d0e2-4755-8f77-c5ec25a01911	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 17:35:55.454
4acbdfeb-27ef-4572-aa4d-d80896602824	\N	\N	38b6d2c6-dff4-4b17-b33d-e29e95670313	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:18:37.692
14dc8e2a-08b6-4be2-8194-056e754499c5	\N	\N	01ce8bc3-0cb4-468a-80f7-25c7daf4299f	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-29 17:49:33.785
bedce6a3-dadd-41a0-872d-167a135c1ccb	\N	\N	e767d4ba-8503-431b-b35c-6810fd31ffcd	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-29 17:50:32.416
8f6a6df2-6d5b-4c54-8dbb-1af5c60eeeba	\N	\N	9be525ba-e479-46fa-ac71-7019cb68d61e	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	GESTAO_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-29 17:52:26.158
6e325350-9234-40a3-948b-c6a4391b922b	\N	\N	9db0b313-0c35-43bc-a02b-7bcb7979f8e1	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	GESTAO_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 17:29:47.582
3963247c-e862-4b8e-970d-012a40ccefab	\N	\N	6c3f357c-2a25-4a74-8a2a-5f46b77b7154	aa44b21d-a846-4615-82a0-8a99f93e07d1	comercial@teste.com	Cliente recusou a proposta	O cliente recusou a proposta. Acesse o ticket para verificar o motivo.	CLIENTE_RECUSOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-04-30 13:04:02.476
a6c84676-9711-4df3-8271-4efc6fe6a341	\N	\N	35324ae9-7707-4d57-ae06-a414d2c9c77b	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	GESTAO_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 17:37:09.72
a83ebb20-6af6-484d-ba21-6c63f9945249	\N	\N	fb253e16-9294-4196-868c-c2ec15ca81b5	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	natura@natura.com	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 12:27:03.352
a7dad803-d155-4bef-811e-e42f1a52e560	\N	\N	319b0102-344e-4ff3-9d71-5ba85883fa0b	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:17:54.733
1ae83da9-8384-4bb9-bf14-bf8d49e3675e	\N	\N	7f82f556-9bef-470e-b1ad-e10d44892a48	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:25:15.06
7cbe552f-fe7f-4370-8563-574859b12faf	\N	\N	50bafa3f-0406-4f4d-b58e-9b043c81a33d	e586d272-b2df-440c-9a27-5a96c07f3f36	gestao@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:26:26.1
ba8a18b7-3161-41c1-bc69-88dcb18cf541	\N	\N	b3a37477-b5a0-4494-8d97-e03e46c7b83b	e586d272-b2df-440c-9a27-5a96c07f3f36	gestao@teste.com	Gestao solicitou ajuste na proposta	A Gestao solicitou ajuste na proposta. O retorno foi enviado ao Comercial.	GESTAO_SOLICITOU_AJUSTE_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:33:24.358
52154d15-6568-4ecf-80d5-197593c106c1	\N	\N	c6a584ce-cfed-4fb4-86f7-576c707a1b97	c6128d55-5786-416b-b274-e87446203ce7	boticario@teste.com.br	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:33:54.019
a7982aa3-c8f5-4a85-a26e-13e3001ac306	\N	\N	311dcadf-5af5-470e-903e-de92abc54229	e586d272-b2df-440c-9a27-5a96c07f3f36	gestao@teste.com	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:34:48.007
08b64ed5-644b-4ce6-8044-252f5372b3e3	\N	\N	799cd820-9eb8-4e21-8222-de31b6629db0	e586d272-b2df-440c-9a27-5a96c07f3f36	gestao@teste.com	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	GESTAO_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-05 14:36:01.084
c4189baf-2900-43e7-a4d3-ad2818c69ea8	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	a480dcf2-7c53-42d6-9174-d627f66c8c5a	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	natura@natura.com	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	proposta_disponivel_cliente	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 13:03:13.994
93746863-fafa-43c0-8d0f-800ec90a173d	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	4d80f638-c5b9-46e1-b4ba-373463c7a661	aa44b21d-a846-4615-82a0-8a99f93e07d1	maiara.comercial@pizzattolog.com.br	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	CLIENTE_APROVOU_PROPOSTA	IGNORADO	\N	\N	EMAIL_WEBHOOK_URL nao configurado.	\N	2026-05-06 13:09:51.269
\.


--
-- Data for Name: Notification; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Notification" (id, "userId", "ticketId", title, message, link, metadata, "readAt", "createdAt") FROM stdin;
7658939c-d38d-4dd0-91e2-262d7dcd3412	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua solicitacao foi respondida	Nossa equipe respondeu sua solicitacao. Acesse o ticket para visualizar a devolutiva.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:03:08.442	2026-04-29 17:01:56.607
c65c4b9c-d979-4855-baf9-930a3dbf82b8	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao foi recebida	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:03:08.825	2026-04-29 16:48:16.713
0aa5542d-3509-48c1-bc34-eaa5426a3e8c	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	\N	Sua cotacao foi recebida	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	\N	2026-05-06 12:06:38.641	2026-05-06 12:06:24.308
77c597f4-2332-4713-9b2b-7f0dd4045fae	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	\N	2026-05-06 12:07:58.764	2026-05-06 12:06:24.338
ab5f187d-5b2a-44b6-9c72-c665d5791c84	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	{"status": "APROVADA_PELA_GESTAO", "versao": 1, "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b", "propostaCode": "PROP-469329"}	2026-05-06 12:39:40.652	2026-05-06 12:39:27.157
bb94c69c-54a4-4c13-a27f-30ffe5332d21	e586d272-b2df-440c-9a27-5a96c07f3f36	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaCode": "PROP-798640"}	2026-05-06 13:12:36.838	2026-05-06 13:12:17.23
96b3a7af-c4a9-4ac4-a602-1f7b9dc01f2d	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaCode": "PROP-798640"}	2026-05-06 13:35:54.25	2026-05-06 13:12:17.233
e61f6a89-a506-4397-a08c-287742d90b52	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	\N	2026-05-06 13:51:49.102	2026-05-06 12:06:24.338
22ad0a5c-0df7-4cee-a708-6ef5e7df5eec	aa44b21d-a846-4615-82a0-8a99f93e07d1	8006ba26-2dee-41ae-b954-0997f5c88b66	Novo lead recebido	Novo lead recebido. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=8006ba26-2dee-41ae-b954-0997f5c88b66	\N	2026-05-06 17:54:53.363	2026-05-06 17:54:16.223
f7e4b758-e75a-436e-923e-9462dd107df0	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	8006ba26-2dee-41ae-b954-0997f5c88b66	Novo lead recebido	Novo lead recebido. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=8006ba26-2dee-41ae-b954-0997f5c88b66	\N	2026-05-06 18:54:12.507	2026-05-06 17:54:16.223
6d6a1714-4645-4790-9420-0ae8b76b340d	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b"}	2026-05-06 12:14:55.134	2026-05-06 12:14:25.986
ec477a01-8277-426e-9a32-83cbfaa59cd3	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e", "propostaCode": "PROP-862600"}	2026-04-29 17:51:49.927	2026-04-29 17:51:32.581
6c7add2a-1728-4c70-8a9c-f4cb63689f75	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao foi recebida	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	\N	2026-04-30 12:18:36.357	2026-04-30 12:18:28.455
230cd37f-1963-4655-8f10-77e04b2a0e4a	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	\N	2026-04-30 12:22:39.873	2026-04-30 12:18:28.48
4409226e-cb7d-40e0-8e2f-9d4047723510	aa44b21d-a846-4615-82a0-8a99f93e07d1	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	\N	2026-05-06 12:56:04.176	2026-05-06 12:55:43.811
cd62cef2-6244-40a7-b45a-36f57d7ef791	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "19933829-4481-4243-87dd-1234ff3576c2"}	2026-04-30 12:32:07.297	2026-04-30 12:29:06.267
efe0e7b8-0a7e-4c09-bcd2-875b6484d7d5	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	\N	2026-04-30 12:32:07.711	2026-04-30 12:30:37.022
ad3eebc3-0efd-4513-9a5e-260c816c8644	c6128d55-5786-416b-b274-e87446203ce7	\N	Ticket aberto no CRM	Uma solicitacao foi registrada para acompanhamento pelo portal.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	\N	2026-04-30 12:55:21.626	2026-04-30 12:54:33.004
de3a6385-f73f-4fed-8136-39e5bfb5bf83	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Sua cotacao foi recebida	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	\N	2026-05-06 13:03:42.99	2026-05-06 12:55:43.804
fdbbf685-0066-4ac9-acd3-eca1a8f85580	aa44b21d-a846-4615-82a0-8a99f93e07d1	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	{"status": "APROVADA_PELA_GESTAO", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaCode": "PROP-798640"}	2026-05-06 13:13:19.461	2026-05-06 13:12:58.622
15441b73-f0ba-43c4-91e8-e1169367522c	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "641408d1-5259-4def-b566-04669778390e"}	2026-04-30 12:58:56.217	2026-04-30 12:57:34.241
8217d163-98b4-49df-b113-453d9a9076a7	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	\N	2026-05-06 13:35:54.79	2026-05-06 12:55:43.811
993c0bc5-2de2-4b95-9f8d-b25068dd352f	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	\N	2026-04-30 12:58:56.393	2026-04-30 12:56:33.723
3c3c277d-70d2-4d3f-885c-76ef50923152	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "641408d1-5259-4def-b566-04669778390e"}	2026-04-30 13:00:26.026	2026-04-30 13:00:01.977
f4c2d650-0b7e-4b00-a7bd-6e9a8398ac47	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	1e1715a2-d797-40db-80ee-16f2ad89079a	Sua cotacao foi recebida	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	/tickets?ticket=1e1715a2-d797-40db-80ee-16f2ad89079a	\N	\N	2026-05-06 18:01:43.23
a0e2ecc6-8f60-4f59-a396-3c3403c9a5c8	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "641408d1-5259-4def-b566-04669778390e", "propostaCode": "PROP-874065"}	2026-04-30 13:00:53.949	2026-04-30 13:00:36.671
1ea8e613-646a-45b8-b09e-566457c08430	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Ticket aguardando acao comercial	O ticket foi atualizado e exige acao do Comercial.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	\N	2026-05-05 14:47:30.788	2026-05-05 14:23:36.804
fa6db8b4-25bd-4267-9d31-cdb9e862d8bf	aa44b21d-a846-4615-82a0-8a99f93e07d1	1e1715a2-d797-40db-80ee-16f2ad89079a	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=1e1715a2-d797-40db-80ee-16f2ad89079a	\N	2026-05-06 18:01:57.516	2026-05-06 18:01:43.247
f5a8ab80-2002-41ba-b9c7-1c0257e72c22	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	1e1715a2-d797-40db-80ee-16f2ad89079a	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=1e1715a2-d797-40db-80ee-16f2ad89079a	\N	2026-05-06 18:54:08.788	2026-05-06 18:01:43.247
fbaa1811-5e72-418a-9b41-6cfb1690b955	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente solicitou ajuste na proposta	O cliente solicitou ajuste na proposta. Acesse o ticket para revisar.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	{"status": "AJUSTE_SOLICITADO_PELO_CLIENTE", "versao": 1, "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b"}	2026-05-06 12:24:11.187	2026-05-06 12:23:37.332
2022d852-9e29-40fc-921d-37dd9befd12e	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	\N	2026-04-30 17:20:21.469	2026-04-30 17:19:58.626
652fda6d-27e7-42ae-964d-b845f8f82714	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	\N	2026-05-01 19:23:18.161	2026-04-30 17:19:58.626
a480dcf2-7c53-42d6-9174-d627f66c8c5a	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	2026-05-06 13:03:42.724	2026-05-06 13:03:13.992
456265e5-d4d2-4cba-aaee-8cc54bb3b97a	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Gestao solicitou ajuste na proposta	A Gestao solicitou ajuste na proposta. O retorno foi enviado ao Comercial.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	{"status": "AJUSTE_SOLICITADO_PELA_GESTAO", "versao": 1, "propostaId": "641408d1-5259-4def-b566-04669778390e", "propostaCode": "PROP-874065"}	2026-04-30 13:01:44.415	2026-04-30 13:01:17.584
74197736-b066-436b-9a29-edf748ce298c	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "641408d1-5259-4def-b566-04669778390e"}	2026-04-30 13:02:24.027	2026-04-30 13:02:08.06
6c3f357c-2a25-4a74-8a2a-5f46b77b7154	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente recusou a proposta	O cliente recusou a proposta. Acesse o ticket para verificar o motivo.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	{"status": "RECUSADA_PELO_CLIENTE", "versao": 1, "propostaId": "641408d1-5259-4def-b566-04669778390e"}	2026-04-30 13:04:23.049	2026-04-30 13:04:02.474
96907629-5a9b-444e-932b-e76d9624bf33	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	\N	2026-04-30 17:06:31.339	2026-04-30 13:04:41.901
e30169b3-59d9-4197-b653-5d4652bd8725	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=6be6020b-05e2-4bee-a931-76247207b097	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "641408d1-5259-4def-b566-04669778390e", "propostaCode": "PROP-874065"}	2026-05-01 19:27:19.475	2026-04-30 13:00:36.672
cecc5680-611d-414a-8820-6ba45beb3646	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_PARA_GESTAO", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "propostaCode": "PROP-968962"}	2026-05-05 14:47:30.788	2026-05-05 14:35:28.342
8f71594f-b429-4a36-b6bc-57a7dae45449	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Novo lead recebido	Novo lead recebido. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=98d83c44-5696-4062-ac34-12817e56a431	\N	2026-05-06 16:59:00.048	2026-05-06 16:58:33.768
427584ba-9d9f-495a-966b-ef8272814c3d	c6128d55-5786-416b-b274-e87446203ce7	\N	Ticket aberto no CRM	Uma solicitacao foi registrada para acompanhamento pelo portal.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	\N	2026-05-05 14:18:13.74	2026-05-05 14:16:47.597
319b0102-344e-4ff3-9d71-5ba85883fa0b	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "962e8b33-ad6f-475c-86bb-46a2b7f2e011"}	2026-05-05 14:18:14.014	2026-05-05 14:17:54.726
249d4ca0-1a0d-4db2-964f-077d51b69041	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	\N	Cliente atualizado	Cadastro de Friboi atualizado: empresa.	/clients/85a7434d-1b74-40f3-a19b-1f3752ba5ad8	{"action": "CLIENT_UPDATED", "clientId": "85a7434d-1b74-40f3-a19b-1f3752ba5ad8", "changedFields": ["empresa"]}	\N	2026-05-06 18:52:25.503
693d31ed-f0fd-4a6d-a688-c78f7942f2e8	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente atualizado	Cadastro de Friboi atualizado: empresa.	/clients/85a7434d-1b74-40f3-a19b-1f3752ba5ad8	{"action": "CLIENT_UPDATED", "clientId": "85a7434d-1b74-40f3-a19b-1f3752ba5ad8", "changedFields": ["empresa"]}	2026-05-06 18:52:47.549	2026-05-06 18:52:25.503
d3a17501-3839-428b-ba28-571bd67a3b97	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Novo lead recebido	Novo lead recebido. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=98d83c44-5696-4062-ac34-12817e56a431	\N	2026-05-06 18:54:14.612	2026-05-06 16:58:33.768
fb253e16-9294-4196-868c-c2ec15ca81b5	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b"}	2026-05-06 12:27:37.698	2026-05-06 12:27:03.348
01712677-9432-43ec-ab0b-502a4999486c	aa44b21d-a846-4615-82a0-8a99f93e07d1	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Cliente solicitou ajuste na proposta	O cliente solicitou ajuste na proposta. Acesse o ticket para revisar.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	{"status": "AJUSTE_SOLICITADO_PELO_CLIENTE", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	2026-05-06 13:07:23.995	2026-05-06 13:05:47.089
eded1774-3542-4278-b9d6-7c7a2aa58265	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente atualizado	Cadastro de Transporte Romana atualizado: status.	/clients/bafee647-b869-4fbe-8765-b10135f12c4d	{"action": "CLIENT_UPDATED", "clientId": "bafee647-b869-4fbe-8765-b10135f12c4d", "changedFields": ["status"]}	2026-05-06 17:09:06.619	2026-05-06 17:08:54.654
c4d6dc09-6f8b-409d-9b09-75b6eb98a813	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	\N	Sua cotacao foi recebida	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	\N	2026-05-05 17:27:51.211	2026-05-05 17:27:34.35
7d70758f-1e91-4cc6-925a-d97cee4546f7	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	\N	2026-05-05 17:29:05.648	2026-05-05 17:27:34.367
0f17861b-89a2-429d-94d2-fee0d7567823	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Ticket aguardando acao comercial	O ticket foi atualizado e exige acao do Comercial.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	\N	2026-05-05 14:24:17.702	2026-05-05 14:23:36.804
c6a584ce-cfed-4fb4-86f7-576c707a1b97	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_AO_CLIENTE", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353"}	2026-05-05 14:34:28.709	2026-05-05 14:33:54.017
7f82f556-9bef-470e-b1ad-e10d44892a48	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_AO_CLIENTE", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353"}	2026-05-05 14:26:20.752	2026-05-05 14:25:15.047
cc59a2a1-37a0-4591-92c1-10104a06ccb0	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	\N	2026-05-05 14:26:21.148	2026-05-05 14:23:53.341
9ff7c89a-4d31-47ae-9044-9883749c463b	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_PARA_GESTAO", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "propostaCode": "PROP-968962"}	2026-05-05 14:35:49.607	2026-05-05 14:35:28.34
311dcadf-5af5-470e-903e-de92abc54229	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "APROVADA_PELO_CLIENTE", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353"}	2026-05-05 14:35:49.847	2026-05-05 14:34:48.005
a5269bea-19d2-4e9a-b7f7-4b9b13948677	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b"}	2026-05-06 12:28:01.201	2026-05-06 12:27:43.867
5d02a4ab-1e7e-43b3-b038-837e9c32913d	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	2026-05-06 13:09:25.251	2026-05-06 13:09:08.574
66d411f4-5336-483d-88e7-3ee6b02c48e9	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Solicitacao de exclusao de cliente	Transporte Romana foi enviado para aprovacao de exclusao.	/clients	{"action": "CLIENT_DELETION_REQUESTED", "clientId": "bafee647-b869-4fbe-8765-b10135f12c4d", "deletionRequestId": "f6bd5d80-fb35-42c6-a1c9-a752e7bb0d39"}	2026-05-06 17:46:33.611	2026-05-06 17:18:31.589
5ae79ba1-960b-43ca-8847-5e4bd73be616	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Cliente respondeu ao ticket	O cliente respondeu uma demanda. Acesse o ticket para dar continuidade.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	\N	2026-05-05 19:16:01.238	2026-05-05 17:33:04.523
c01498a3-d0e2-4755-8f77-c5ec25a01911	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "b1b1c15f-dda9-42fc-8544-3f5e14f94d67"}	2026-05-05 17:36:14.907	2026-05-05 17:35:55.451
1dceb2f6-7274-47a0-b0f9-b5f997c3f54d	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "b1b1c15f-dda9-42fc-8544-3f5e14f94d67", "propostaCode": "PROP-043725"}	2026-05-05 17:36:52.775	2026-05-05 17:36:35.175
a0e8714b-2cc3-4ce2-9f2a-4d1199451b11	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "b1b1c15f-dda9-42fc-8544-3f5e14f94d67", "propostaCode": "PROP-043725"}	2026-05-05 19:16:01.238	2026-05-05 17:36:35.177
35324ae9-7707-4d57-ae06-a414d2c9c77b	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	{"status": "APROVADA_PELA_GESTAO", "versao": 1, "propostaId": "b1b1c15f-dda9-42fc-8544-3f5e14f94d67", "propostaCode": "PROP-043725"}	2026-05-05 17:37:42.612	2026-05-05 17:37:09.717
9d6e2c0e-a3cc-4656-af92-6751fdb88656	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Solicitacao de exclusao de cliente	Transporte Romana foi enviado para aprovacao de exclusao.	/clients	{"action": "CLIENT_DELETION_REQUESTED", "clientId": "bafee647-b869-4fbe-8765-b10135f12c4d", "deletionRequestId": "f6bd5d80-fb35-42c6-a1c9-a752e7bb0d39"}	2026-05-06 18:54:14.612	2026-05-06 17:18:31.589
248b9f82-1b2c-4d5d-a01c-a7a1602b5212	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:07:41.671	2026-04-29 17:05:48.205
6a17a9b5-c0ce-450f-946b-9f31b25873b4	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e"}	2026-04-29 17:32:54.636	2026-04-29 17:32:35.453
c52eb2e4-8401-43da-a9c8-d88e18a9be98	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua solicitacao foi respondida	Nossa equipe respondeu sua solicitacao. Acesse o ticket para visualizar a devolutiva.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:32:54.906	2026-04-29 17:32:19.62
dc6449e1-6f9f-4e0e-81ec-423e8c2a4983	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e"}	2026-04-29 17:33:38.698	2026-04-29 17:33:14.387
c4ca6a76-152d-46cc-bae4-b5658cd9bc00	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Negociacao aguardando aprovacao da Gestao	Uma negociacao foi enviada para aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:34:56.86	2026-04-29 17:33:45.642
2aea6240-65b9-4a2a-94d9-2705d33ebd1d	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e", "propostaCode": "PROP-862600"}	2026-04-29 17:34:57.047	2026-04-29 17:33:46.511
ae076432-c8c6-4ea3-9509-39b0489b991f	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:36:45.835	2026-04-29 17:35:46.562
d673869f-0aa1-4fbb-ac1c-51ac981e5688	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:36:45.991	2026-04-29 17:35:23.517
cf377807-bf7d-4347-9d44-9d5fd1c6f767	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua solicitacao foi respondida	Nossa equipe respondeu sua solicitacao. Acesse o ticket para visualizar a devolutiva.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:36:45.991	2026-04-29 17:35:29.991
23034ac3-9007-4991-8b8b-418656deb699	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao esta em analise	Nossa equipe comercial iniciou a analise da sua solicitacao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:36:45.991	2026-04-29 17:35:42.714
a74988b0-dc90-4934-a252-1054936c65d6	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Negociacao aguardando aprovacao da Gestao	Uma negociacao foi enviada para aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:39:53.292	2026-04-29 17:37:22.883
7fa705be-50fb-4135-ad34-1e6b0ad62570	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:39:53.544	2026-04-29 16:48:16.742
30c83835-a404-4365-b81b-f11f5bfaab91	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Negociacao aguardando aprovacao da Gestao	Uma negociacao foi enviada para aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:39:53.544	2026-04-29 17:33:45.642
7e988f57-84aa-4c56-874d-4ebebebec837	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e", "propostaCode": "PROP-862600"}	2026-04-29 17:39:53.544	2026-04-29 17:33:46.51
935c2ea6-a77b-438d-80ec-efe0ed5e81af	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Negociacao aguardando aprovacao da Gestao	Uma negociacao foi enviada para aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	\N	2026-04-29 17:48:10.926	2026-04-29 17:37:22.883
af7ff1b0-0c4a-47cd-ba69-3ee43f369e33	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Gestao solicitou ajuste na proposta	A Gestao solicitou ajuste na proposta. O retorno foi enviado ao Comercial.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "AJUSTE_SOLICITADO_PELA_GESTAO", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e", "propostaCode": "PROP-862600"}	2026-04-29 17:49:17.04	2026-04-29 17:48:58.137
01ce8bc3-0cb4-468a-80f7-25c7daf4299f	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e"}	2026-04-29 17:49:53.328	2026-04-29 17:49:33.783
e767d4ba-8503-431b-b35c-6810fd31ffcd	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e"}	2026-04-29 17:50:51.031	2026-04-29 17:50:32.413
9be525ba-e479-46fa-ac71-7019cb68d61e	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "APROVADA_PELA_GESTAO", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e", "propostaCode": "PROP-862600"}	2026-04-29 17:52:57.116	2026-04-29 17:52:26.157
74d82d38-c659-4a64-abfe-ede9b8940189	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=15c10af2-bea5-4a3c-a424-f1a845b952e2	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "6f7f189f-f644-44b1-86af-d4735154850e", "propostaCode": "PROP-862600"}	2026-04-29 19:57:41.12	2026-04-29 17:51:32.58
6e8aa6ae-1489-4fd5-b41b-9698a0004b55	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua solicitacao foi respondida	Nossa equipe respondeu sua solicitacao. Acesse o ticket para visualizar a devolutiva.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	\N	2026-04-30 12:32:07.711	2026-04-30 12:30:47.662
14c62d60-f1f1-4e73-8b54-70fd6a8bdbcb	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "19933829-4481-4243-87dd-1234ff3576c2"}	2026-04-30 12:33:44.367	2026-04-30 12:33:12.948
0fff8d54-10b2-4f11-bdc5-3381c5dc5ebb	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "19933829-4481-4243-87dd-1234ff3576c2", "propostaCode": "PROP-438821"}	2026-04-30 12:35:40.248	2026-04-30 12:34:01.012
49874be9-06ef-42bc-b78d-047332d57bce	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	{"status": "APROVADA_PELA_GESTAO", "versao": 1, "propostaId": "19933829-4481-4243-87dd-1234ff3576c2", "propostaCode": "PROP-438821"}	2026-04-30 12:56:15.801	2026-04-30 12:36:33.986
9cad938b-f345-4f58-96e9-ddd41a8cab12	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "19933829-4481-4243-87dd-1234ff3576c2", "propostaCode": "PROP-438821"}	2026-05-01 19:27:16.786	2026-04-30 12:34:01.015
b90bc529-442c-4ba9-aa4e-6c7a971cbe9a	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=5896c3d0-d2cc-4dd2-a170-2b3f3b4cb046	\N	2026-05-01 19:27:17.173	2026-04-30 12:18:28.48
6b39ae4c-d32d-46fa-8740-3e18619cb53f	c6128d55-5786-416b-b274-e87446203ce7	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "700c13d2-b9ff-4a9d-a855-b8c17e365e8f"}	2026-04-30 17:26:10.123	2026-04-30 17:21:35.139
9476e71d-2eed-40f4-85fc-5eef9c8c8aa1	c6128d55-5786-416b-b274-e87446203ce7	\N	Sua cotacao foi recebida	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	\N	2026-04-30 17:26:10.46	2026-04-30 17:19:58.6
16cc64ea-8885-4992-90a4-3a48ccf7ca97	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "700c13d2-b9ff-4a9d-a855-b8c17e365e8f"}	2026-04-30 17:27:04.613	2026-04-30 17:26:20.006
44c08c7b-0d7e-49e4-890f-6b25cdec3c31	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "700c13d2-b9ff-4a9d-a855-b8c17e365e8f", "propostaCode": "PROP-749369"}	2026-04-30 17:27:45.925	2026-04-30 17:27:15.67
9db0b313-0c35-43bc-a02b-7bcb7979f8e1	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	{"status": "APROVADA_PELA_GESTAO", "versao": 1, "propostaId": "700c13d2-b9ff-4a9d-a855-b8c17e365e8f", "propostaCode": "PROP-749369"}	2026-04-30 17:30:19.577	2026-04-30 17:29:47.58
b91e23f8-c271-483b-8b79-47032c543408	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=5a2b5c9b-4206-4068-bf73-91e94b414fb8	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "700c13d2-b9ff-4a9d-a855-b8c17e365e8f", "propostaCode": "PROP-749369"}	2026-05-01 19:23:17.823	2026-04-30 17:27:15.671
d56155d0-90b5-4b3f-b9dc-3c89471dceb7	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Nova cotacao recebida no CRM	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	\N	2026-05-05 19:16:01.238	2026-05-05 17:27:34.367
ae6757ce-9016-4981-b9ff-8b06db0789e9	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	\N	Sua solicitacao foi respondida	Nossa equipe respondeu sua solicitacao. Acesse o ticket para visualizar a devolutiva.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	\N	2026-05-05 17:32:35.893	2026-05-05 17:31:02.062
c8e9e1f0-2ce4-445e-a956-e3bdeeb4eb64	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente respondeu ao ticket	O cliente respondeu uma demanda. Acesse o ticket para dar continuidade.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	\N	2026-05-05 17:33:34.535	2026-05-05 17:33:04.523
4538b499-ab6b-4497-a095-60618eeb3b3d	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	\N	Proposta disponivel para analise	Sua proposta esta disponivel para analise. Acesse o ticket para visualizar, aprovar, solicitar ajuste ou recusar.	/tickets?ticket=79eff664-aa1d-443c-ac81-efc90ee2c022	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "b1b1c15f-dda9-42fc-8544-3f5e14f94d67"}	2026-05-05 17:35:19.837	2026-05-05 17:35:01.821
38b6d2c6-dff4-4b17-b33d-e29e95670313	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "962e8b33-ad6f-475c-86bb-46a2b7f2e011"}	2026-05-05 14:18:49.633	2026-05-05 14:18:37.689
8f827ddf-1f4a-4828-ba41-062df7e245df	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "962e8b33-ad6f-475c-86bb-46a2b7f2e011", "propostaCode": "PROP-709081"}	2026-05-05 14:23:28.507	2026-05-05 14:22:57.232
cc5bb1aa-6d3d-4d9f-9c3d-0f3d91d70542	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_PARA_GESTAO", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "propostaCode": "PROP-968962"}	2026-05-05 14:32:11.532	2026-05-05 14:31:52.727
50bafa3f-0406-4f4d-b58e-9b043c81a33d	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "APROVADA_PELO_CLIENTE", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353"}	2026-05-05 14:32:11.823	2026-05-05 14:26:26.098
b3a37477-b5a0-4494-8d97-e03e46c7b83b	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Gestao solicitou ajuste na proposta	A Gestao solicitou ajuste na proposta. O retorno foi enviado ao Comercial.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "AJUSTE_SOLICITADO_PELA_GESTAO", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "propostaCode": "PROP-968962"}	2026-05-05 14:33:24.588	2026-05-05 14:33:24.352
799cd820-9eb8-4e21-8222-de31b6629db0	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Gestao aprovou a proposta	A Gestao aprovou a proposta. O retorno esta disponivel para o Comercial.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "APROVADA_PELA_GESTAO", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "propostaCode": "PROP-968962"}	2026-05-05 14:36:01.284	2026-05-05 14:36:01.082
eff8a3e1-35e3-4df6-a6e4-2079dd67cb7b	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "962e8b33-ad6f-475c-86bb-46a2b7f2e011", "propostaCode": "PROP-709081"}	2026-05-05 14:47:30.377	2026-05-05 14:22:57.234
e368f80e-ad39-4674-baaf-5b0119c545a8	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=9b7e9bd5-fa4e-4007-a9f7-1ad48433f5a9	{"status": "ENVIADA_PARA_GESTAO", "versao": 2, "propostaId": "dabeef50-d015-4da6-988f-a96cfcfe4353", "propostaCode": "PROP-968962"}	2026-05-05 14:47:30.788	2026-05-05 14:31:52.73
19d54cfe-c0dc-4bcd-9700-993399a9842c	e586d272-b2df-440c-9a27-5a96c07f3f36	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b", "propostaCode": "PROP-469329"}	2026-05-06 12:32:26.404	2026-05-06 12:32:02.927
4d80f638-c5b9-46e1-b4ba-373463c7a661	aa44b21d-a846-4615-82a0-8a99f93e07d1	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	Cliente aprovou a proposta	O cliente aprovou a proposta. Envie para aprovacao da Gestao.	/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287	{"status": "APROVADA_PELO_CLIENTE", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	2026-05-06 13:10:09.033	2026-05-06 13:09:51.268
f128d78b-7646-44ea-b784-bc8a66db0b85	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	\N	Proposta aguardando aprovacao da Gestao	Uma proposta formal foi enviada para analise e aprovacao da Gestao.	/tickets?ticket=97313331-1843-4534-a048-0d3cd16ef39c	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "f1a40751-1922-4e47-b024-2a476aae131b", "propostaCode": "PROP-469329"}	2026-05-06 13:51:45.779	2026-05-06 12:32:02.929
bdd15b66-a776-4657-ab6f-4cfd18fbc601	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	Cliente excluido	Transporte Romana foi excluido apos aprovacao da Gestao.	/clients	{"action": "CLIENT_DELETED", "clientId": "bafee647-b869-4fbe-8765-b10135f12c4d", "deletionRequestId": "f6bd5d80-fb35-42c6-a1c9-a752e7bb0d39"}	2026-05-06 17:52:59.453	2026-05-06 17:52:25.696
\.


--
-- Data for Name: Opportunity; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Opportunity" (id, "clientId", title, value, stage, status, "expectedCloseDate", "lostReason", "createdAt", "updatedAt", "quoteId", "preContract", "preContractNotes") FROM stdin;
85d138f6-1b76-4562-bec0-cd277a28d423	193da2cd-18a0-419d-9a27-91978619b1b8	Pre-contrato - Fracionado	15900.000000000000000000000000000000	GANHO	WON	\N	\N	2026-05-06 12:55:43.794	2026-05-06 13:12:58.616	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	t	Pre-contrato criado automaticamente a partir da cotacao do cliente.
613dba7b-d9af-4516-97f2-2aa96ab01c60	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	Cotacao - Fracionado	\N	NOVO	OPEN	\N	\N	2026-05-06 18:01:43.205	2026-05-06 18:01:43.205	985d9a13-3fe1-49d1-89ff-b969fc5241a3	f	\N
\.


--
-- Data for Name: PortalContent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."PortalContent" (id, title, summary, body, type, "coverImageUrl", "videoUrl", "isPublished", "publishedAt", "authorId", "createdAt", "updatedAt", "campaignName", "ctaLabel", "ctaUrl", highlight) FROM stdin;
4534ed71-eabb-47bd-85d8-757370cc73f8	Campanha da semana	Destaque uma acao comercial com linguagem direta e CTA claro.	Apresente a campanha, beneficios, periodo de vigencia e o passo seguinte para o cliente acionar o time.	NOTICIA	http://localhost:3001/uploads/portal-content/file-1777901663001-316130525.png	\N	t	2026-05-04 13:36:42.408	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:34:42.839	2026-05-04 13:36:42.419	Campanha comercial	Saiba mais	\N	f
761fe2c0-fa08-46ed-b49c-ce78f6b4c1fc	Nova noticia do portal	Comunique uma novidade importante para clientes e equipes internas.	Escreva um texto curto, escaneavel e com informacoes centrais para leitura rapida.	NOTICIA	http://localhost:3001/uploads/portal-content/file-1777901713757-968283751.png	\N	t	2026-05-04 13:36:49.054	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:35:34.216	2026-05-04 13:36:49.056	Atualizacao do portal	Ver detalhe	\N	f
4db29f4a-07b6-4591-b4e5-ec6a77502e46	Campanha da semana Pizzattolog	Destaque uma acao comercial com linguagem direta e CTA claro.	Apresente a campanha, beneficios, periodo de vigencia e o passo seguinte para o cliente acionar o time.	NOTICIA	http://localhost:3001/uploads/portal-content/file-1777901523063-777410862.png	\N	t	2026-05-05 18:40:53.259	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-04 13:32:11.713	2026-05-05 18:40:53.264	Campanha comercial	Saiba mais	\N	f
f63a8913-705a-4679-a1b1-559bb513a179	Campanha do Agasalho Pizzattolog	Campanha para o inverno de 2026	Saiba mais...	INFORMACAO	http://localhost:3001/uploads/portal-content/file-1778006830488-660148098.png	\N	t	2026-05-05 19:03:29.956	d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	2026-05-05 18:43:05.335	2026-05-05 19:03:29.959	Doe seu casaco	Saiba mais	http://pizzattolog.com.br/campanhadoagasalho	f
\.


--
-- Data for Name: Proposta; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Proposta" (id, "ticketId", "quoteId", "opportunityId", "clientId", "criadaPorId", "enviadaPorId", status, titulo, descricao, "descricaoServico", origem, destino, valor, "condicoesPagamento", "condicoesComerciais", observacoes, "validadeDias", "validaAte", versao, "enviadaEm", "aprovadaPeloClienteEm", "recusadaPeloClienteEm", "ajusteSolicitadoPeloClienteEm", "enviadaParaGestaoEm", "aprovadaPelaGestaoEm", "recusadaPelaGestaoEm", "ajusteSolicitadoPelaGestaoEm", "createdAt", "updatedAt", code, "arquivoNome", "arquivoUrl", "arquivoMimeType", "arquivoTamanho", "motivoRecusaCliente") FROM stdin;
8990f30e-ddd1-4aa8-b4d9-aba73d8368bc	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	85d138f6-1b76-4562-bec0-cd277a28d423	193da2cd-18a0-419d-9a27-91978619b1b8	aa44b21d-a846-4615-82a0-8a99f93e07d1	aa44b21d-a846-4615-82a0-8a99f93e07d1	APROVADA_PELA_GESTAO	Operação Aero	\N	Carga de cosmético	São paulo	Bahia	15900.000000000000000000000000000000	45	Serviço de transporte	R$ 15.900,00 valor ajustado!	15	\N	1	2026-05-06 13:09:08.535	2026-05-06 13:09:51.237	\N	2026-05-06 13:05:47.067	2026-05-06 13:12:17.204	2026-05-06 13:12:58.606	\N	\N	2026-05-06 13:02:19.536	2026-05-06 13:12:58.607	PROP-798640	pdfDiploma.pdf	/uploads/propostas/67036b0cddfabb9d627f6be1eea8e46d	application/pdf	823975	\N
1ab9aab3-3eb0-480c-908b-d6587791855a	8006ba26-2dee-41ae-b954-0997f5c88b66	\N	\N	\N	aa44b21d-a846-4615-82a0-8a99f93e07d1	\N	RASCUNHO	Fracionado	\N	\N	curitiba	são paulo	18900.000000000000000000000000000000	\N	\N	\N	30 dias	\N	1	\N	\N	\N	\N	\N	\N	\N	\N	2026-05-06 18:03:46.03	2026-05-06 18:03:46.058	PROP-045444	\N	\N	\N	\N	\N
\.


--
-- Data for Name: Prospect; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Prospect" (id, "nomeRazaoSocial", "nomeContato", email, telefone, document, cidade, estado, origem, "statusCadastral", "portalAccessStatus", "createdFromTicketId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Quote; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Quote" (id, "clientId", origin, destination, "serviceType", weight, volume, quantity, "desiredDeadline", notes, price, "commercialNotes", status, "createdAt", "updatedAt", "cargoDescription", "contactName", "contactPhone", "deliveryAddress", "merchandiseValue", "pickupAddress", "requestType", "contactEmail", code, "prospectId") FROM stdin;
ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	193da2cd-18a0-419d-9a27-91978619b1b8	São paulo	Bahia	Fracionado	600	60	210	2026-06-07 00:00:00	teste	15900.000000000000000000000000000000	R$ 15.900,00 valor ajustado!	ANSWERED	2026-05-06 12:55:43.771	2026-05-06 13:09:08.549	teste	4198888888	413333325	rua teste	6000.000000000000000000000000000000	Rua teste	Contrato	rosa@natura.com	COT-543086	\N
985d9a13-3fe1-49d1-89ff-b969fc5241a3	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	Sp	Curitiba	Fracionado	50	50	60	10	\N	\N	\N	RECEIVED	2026-05-06 18:01:43.17	2026-05-06 18:01:43.193	Teste	41 999999	41 333333	Ruaa yyy	18900.000000000000000000000000000000	Rua xx	Avulsa	friboi@gmail.com	COT-381517	\N
\.


--
-- Data for Name: QuoteHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."QuoteHistory" (id, "quoteId", status, notes, "createdAt") FROM stdin;
5a0f317f-a411-4ab8-897a-9dfcea86e73c	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	RECEIVED	Cotacao criada pelo cliente	2026-05-06 12:55:43.771
55ce07e4-03f7-48f7-9075-2ef500a0e861	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	ANSWERED	Serviço de transporte	2026-05-06 13:03:13.963
8f12853c-bb81-4939-9636-59815025d0fe	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	ANSWERED	R$ 15.900,00 valor ajustado!	2026-05-06 13:09:08.549
e6e824e3-a252-4e41-945a-6c34921397ca	985d9a13-3fe1-49d1-89ff-b969fc5241a3	RECEIVED	Cotacao criada pelo cliente	2026-05-06 18:01:43.17
\.


--
-- Data for Name: SupplierInvite; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."SupplierInvite" (id, "companyName", "contactName", email, phone, token, status, notes, "invitedById", "acceptedAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: Ticket; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Ticket" (id, "clientId", subject, description, status, "createdAt", "updatedAt", "quoteId", "leadId", "opportunityId", "assignedToId", "requesterId", type, "requiresActionRole", "lastInteractionAt", "internalOnly", protocolo, "prospectId", origem, prioridade, "nomeSolicitante", "emailSolicitante", "telefoneSolicitante", mensagem, "formPayload", "closedAt") FROM stdin;
25ccd7f4-a4f4-43c1-a248-f2d86cde6287	193da2cd-18a0-419d-9a27-91978619b1b8	Nova cotacao: Fracionado	Cliente Natura comestico enviou cotacao de São paulo para Bahia.	APROVADO_GESTAO	2026-05-06 12:55:43.797	2026-05-06 13:12:58.617	ba027b37-bdb7-4b71-a3c5-cf47dfd5c319	\N	85d138f6-1b76-4562-bec0-cd277a28d423	\N	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	APROVACAO_GESTAO	\N	2026-05-06 13:12:58.606	f	\N	\N	\N	NORMAL	\N	\N	\N	\N	\N	\N
8006ba26-2dee-41ae-b954-0997f5c88b66	\N	Novo lead: Lucas Sousa	Empresa: Friboi. E-mail: friboi@gmail.com. Telefone: 11 9999999.	AGUARDANDO_COMERCIAL	2026-05-06 17:54:16.19	2026-05-06 17:54:16.19	\N	d785f7ab-5dc3-49cd-9b86-bfb75035b5fa	\N	\N	aa44b21d-a846-4615-82a0-8a99f93e07d1	LEAD	COMERCIAL	2026-05-06 17:54:16.19	t	\N	\N	\N	NORMAL	\N	\N	\N	\N	\N	\N
1e1715a2-d797-40db-80ee-16f2ad89079a	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	Nova cotacao: Fracionado	Cliente 123456 enviou cotacao de Sp para Curitiba.	AGUARDANDO_COMERCIAL	2026-05-06 18:01:43.219	2026-05-06 18:01:43.219	985d9a13-3fe1-49d1-89ff-b969fc5241a3	\N	613dba7b-d9af-4516-97f2-2aa96ab01c60	\N	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	COTACAO	COMERCIAL	2026-05-06 18:01:43.217	f	\N	\N	\N	NORMAL	\N	\N	\N	\N	\N	\N
\.


--
-- Data for Name: TicketHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TicketHistory" (id, "ticketId", "eventType", title, description, metadata, "internalOnly", "createdById", "createdAt") FROM stdin;
c9aba795-33e6-4acd-b1cb-40bb7c5057dc	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	CREATED	Cotacao recebida	Ticket criado automaticamente a partir da cotacao do cliente.	\N	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.797
6c7d35fd-8eb5-48ed-925b-8d38fa27968b	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	NOTIFICATION_SENT	Notificacao enviada	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	{"link": "/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287", "title": "Sua cotacao foi recebida", "recipients": ["f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"]}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.806
445de3b9-8470-4c50-89f7-4743e5c12c28	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	EMAIL_SENT	E-mail registrado	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	{"link": "/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287", "subject": "Sua cotacao foi recebida", "delivery": "registered_without_provider", "recipients": ["f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa"], "recipientEmails": ["natura@natura.com"]}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.807
71f31e67-01f9-482e-aafb-4f801d6c3605	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	NOTIFICATION_SENT	Notificacao enviada	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	{"link": "/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287", "title": "Nova cotacao recebida no CRM", "recipients": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9"]}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.813
969ef03e-f79b-4814-b7cb-12ed88a89eab	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	EMAIL_SENT	E-mail registrado	Natura comestico - Fracionado	{"link": "/tickets?ticket=25ccd7f4-a4f4-43c1-a248-f2d86cde6287", "subject": "Nova cotacao recebida no CRM", "delivery": "registered_without_provider", "recipients": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9"], "recipientEmails": ["maiara.comercial@pizzattolog.com.br", "caroline.augusto@pizzattolog.com.br"]}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.815
74a1e34f-6ac5-45b0-9bb1-cb437d9c7231	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	CREATED	Proposta criada	Proposta v1 criada em rascunho.	{"status": "RASCUNHO", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaCode": "PROP-798640"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:02:19.558
b039257a-54e8-4829-a890-0da9006f7a93	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	PRE_PROPOSAL_SENT	Proposta enviada ao cliente	Proposta enviada para analise do cliente.	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:03:13.989
662e4a94-4ee6-4859-815a-b30a30bc2b59	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	EMAIL_SENT	Envio de e-mail ignorado	EMAIL_WEBHOOK_URL nao configurado.	{"delivery": "ignored_without_provider", "logEmailId": "c4189baf-2900-43e7-a4d3-ad2818c69ea8", "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:03:14.003
8ceeff62-ca35-449c-8861-10a9aef64c11	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	ADJUSTMENT_REQUESTED	Cliente solicitou ajuste na proposta	O cliente solicitou ajuste na proposta: Ajuste conforme email!	{"motivo": "Ajuste conforme email!", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaStatus": "AJUSTE_SOLICITADO_PELO_CLIENTE", "ticketStatusNovo": "AGUARDANDO_COMERCIAL", "ticketStatusAnterior": "AGUARDANDO_CLIENTE"}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:05:47.087
8d79e9ac-ef51-48ea-a187-b37fbdbb1146	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	EMAIL_SENT	Envio de e-mail ignorado	EMAIL_WEBHOOK_URL nao configurado.	{"delivery": "ignored_without_provider", "logEmailId": "f390d2fc-5231-4c89-8abc-d781e727edcf", "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:05:47.097
38ffec7e-0f2d-40a6-a549-5b306d2d6bd9	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	STATUS_CHANGED	Proposta editada	Proposta v1 editada.	{"status": "AJUSTE_SOLICITADO_PELO_CLIENTE", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:08:46.023
9a24eb16-db9f-4684-8580-b223bfd4699d	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	PRE_PROPOSAL_SENT	Proposta enviada ao cliente	Proposta enviada para analise do cliente.	{"status": "ENVIADA_AO_CLIENTE", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:09:08.572
59009338-efa5-42e6-a712-7d266b59c30e	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	EMAIL_SENT	Envio de e-mail ignorado	EMAIL_WEBHOOK_URL nao configurado.	{"delivery": "ignored_without_provider", "logEmailId": "9c68cb5c-d210-41f0-896a-bbca6543f144", "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:09:08.586
ffff0ccb-c1b6-4728-9cff-83e7ceb62d40	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	APPROVED	Cliente aprovou a proposta	O cliente aprovou a proposta.	{"motivo": null, "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaStatus": "APROVADA_PELO_CLIENTE", "ticketStatusNovo": "AGUARDANDO_COMERCIAL", "ticketStatusAnterior": "AGUARDANDO_CLIENTE"}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:09:51.266
08f7c310-3314-4e4c-85f5-8bafd9fc6f77	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	EMAIL_SENT	Envio de e-mail ignorado	EMAIL_WEBHOOK_URL nao configurado.	{"delivery": "ignored_without_provider", "logEmailId": "93746863-fafa-43c0-8d0f-800ec90a173d", "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:09:51.277
a034178d-5cfb-4fd8-bbee-7eafdf534a02	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	APPROVAL_SENT	Proposta enviada para aprovacao da Gestao	A proposta PROP-798640 foi enviada para aprovacao da Gestao.	{"status": "ENVIADA_PARA_GESTAO", "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaCode": "PROP-798640"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:12:17.208
c8dbd7ed-d514-42a8-acea-ce2489e29238	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	APPROVED	Gestao aprovou a proposta	A Gestao aprovou a proposta formal.	{"motivo": null, "versao": 1, "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc", "propostaCode": "PROP-798640", "propostaStatus": "APROVADA_PELA_GESTAO", "ticketStatusNovo": "APROVADO_GESTAO", "ticketStatusAnterior": "AGUARDANDO_GESTAO"}	t	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 13:12:58.62
eabf6c3b-4b02-487c-b09e-c4e37b5d12ce	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	EMAIL_SENT	Envio de e-mail ignorado	EMAIL_WEBHOOK_URL nao configurado.	{"delivery": "ignored_without_provider", "logEmailId": "523b787c-7601-4f06-b267-2a4fa26b940e", "propostaId": "8990f30e-ddd1-4aa8-b4d9-aba73d8368bc"}	f	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 13:12:58.632
a8cfd443-2c9e-41e9-91af-a80767204aea	8006ba26-2dee-41ae-b954-0997f5c88b66	CREATED	Lead recebido	Ticket criado automaticamente a partir de um novo lead.	\N	t	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:54:16.19
e54ff474-939a-4af9-b941-a175df014a19	8006ba26-2dee-41ae-b954-0997f5c88b66	NOTIFICATION_SENT	Notificacao enviada	Novo lead recebido. Acesse o ticket para iniciar o atendimento.	{"link": "/tickets?ticket=8006ba26-2dee-41ae-b954-0997f5c88b66", "title": "Novo lead recebido", "recipients": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9"]}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:54:16.232
491a6e2e-ca56-4792-8e1b-2f3637fd0f53	8006ba26-2dee-41ae-b954-0997f5c88b66	EMAIL_SENT	E-mail registrado	Lucas Sousa - Friboi	{"link": "/tickets?ticket=8006ba26-2dee-41ae-b954-0997f5c88b66", "subject": "Novo lead recebido no CRM", "delivery": "registered_without_provider", "recipients": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9"], "recipientEmails": ["maiara.comercial@pizzattolog.com.br", "caroline.augusto@pizzattolog.com.br"]}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:54:16.24
662238e8-5983-4e5c-9729-0908f0faa674	1e1715a2-d797-40db-80ee-16f2ad89079a	CREATED	Cotacao recebida	Ticket criado automaticamente a partir da cotacao do cliente.	\N	f	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.219
9bf7a7d9-b72c-4816-b31f-597c686eb032	1e1715a2-d797-40db-80ee-16f2ad89079a	NOTIFICATION_SENT	Notificacao enviada	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	{"link": "/tickets?ticket=1e1715a2-d797-40db-80ee-16f2ad89079a", "title": "Sua cotacao foi recebida", "recipients": ["fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b"]}	f	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.234
b8bc898c-57c9-4c98-9e02-e9f002ac7deb	1e1715a2-d797-40db-80ee-16f2ad89079a	EMAIL_SENT	E-mail registrado	Sua cotacao foi enviada com sucesso. Nossa equipe comercial ira analisar e retornara em breve.	{"link": "/tickets?ticket=1e1715a2-d797-40db-80ee-16f2ad89079a", "subject": "Sua cotacao foi recebida", "delivery": "registered_without_provider", "recipients": ["fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b"], "recipientEmails": ["friboi@gmail.com"]}	f	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.237
5f4e4ca3-0512-40a8-a1fd-6047911900fd	1e1715a2-d797-40db-80ee-16f2ad89079a	NOTIFICATION_SENT	Notificacao enviada	Nova cotacao recebida. Acesse o ticket para iniciar o atendimento.	{"link": "/tickets?ticket=1e1715a2-d797-40db-80ee-16f2ad89079a", "title": "Nova cotacao recebida no CRM", "recipients": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9"]}	f	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.253
b2a0a18e-dbce-4042-8084-e45755d3b5db	1e1715a2-d797-40db-80ee-16f2ad89079a	EMAIL_SENT	E-mail registrado	123456 - Fracionado	{"link": "/tickets?ticket=1e1715a2-d797-40db-80ee-16f2ad89079a", "subject": "Nova cotacao recebida no CRM", "delivery": "registered_without_provider", "recipients": ["aa44b21d-a846-4615-82a0-8a99f93e07d1", "15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9"], "recipientEmails": ["maiara.comercial@pizzattolog.com.br", "caroline.augusto@pizzattolog.com.br"]}	f	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.259
53488360-bb85-41c5-8bed-ce190cc6b4d5	8006ba26-2dee-41ae-b954-0997f5c88b66	CREATED	Proposta criada	Proposta v1 criada em rascunho.	{"status": "RASCUNHO", "versao": 1, "propostaId": "1ab9aab3-3eb0-480c-908b-d6587791855a", "propostaCode": "PROP-045444"}	f	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 18:03:46.071
\.


--
-- Data for Name: TicketMessage; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TicketMessage" (id, "ticketId", "senderType", message, "createdById", "createdAt", "updatedAt", "isInternal", attachments) FROM stdin;
73897cd4-4c66-4d1e-88e2-f9ef5b5a8ec8	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	CLIENTE	teste	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.797	2026-05-06 12:55:43.797	f	\N
8f630255-9cac-4f09-bfad-dd9f19bf87db	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	INTERNO	O Comercial enviou uma proposta para analise do cliente.	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:03:13.969	2026-05-06 13:03:13.969	f	[{"url": "/uploads/propostas/67036b0cddfabb9d627f6be1eea8e46d", "name": "pdfDiploma.pdf", "size": 823975, "mimeType": "application/pdf"}]
c5652554-7744-4468-9ea8-1ed368c02ccb	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	CLIENTE	O cliente solicitou ajuste na proposta: Ajuste conforme email!	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:05:47.077	2026-05-06 13:05:47.077	f	\N
f9ea704d-7952-4dad-bf80-80f1135c4648	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	INTERNO	O Comercial enviou uma proposta para analise do cliente.	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 13:09:08.557	2026-05-06 13:09:08.557	f	[{"url": "/uploads/propostas/67036b0cddfabb9d627f6be1eea8e46d", "name": "pdfDiploma.pdf", "size": 823975, "mimeType": "application/pdf"}]
eaeea8a5-d8dc-41f2-a5d4-cb3fbf062bf0	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	CLIENTE	O cliente aprovou a proposta.	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 13:09:51.251	2026-05-06 13:09:51.251	f	\N
a15e13b5-47a9-40e9-909f-938f55268276	25ccd7f4-a4f4-43c1-a248-f2d86cde6287	INTERNO	A Gestao aprovou a proposta formal.	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 13:12:58.618	2026-05-06 13:12:58.618	t	\N
4ef41f6a-0fd9-445f-bc3f-2b6fc3d851e4	8006ba26-2dee-41ae-b954-0997f5c88b66	INTERNO	Empresa: Friboi. E-mail: friboi@gmail.com. Telefone: 11 9999999.	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:54:16.19	2026-05-06 17:54:16.19	t	\N
51af3605-b558-4f49-aeee-64d230d1d31c	1e1715a2-d797-40db-80ee-16f2ad89079a	CLIENTE	Cotacao criada para Fracionado: Sp -> Curitiba.	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.219	2026-05-06 18:01:43.219	f	\N
\.


--
-- Data for Name: TimelineEvent; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TimelineEvent" (id, "clientId", type, title, description, metadata, "createdById", "createdAt", "updatedAt") FROM stdin;
8cf5bc5d-45f5-4f5c-bb6e-fae260d003a2	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	LEAD_CREATED	Lead criado	Lead inicial criado para Boticário.	\N	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-04-29 15:23:31.079	2026-04-29 15:23:31.079
e926abd1-1ce9-4348-895a-ed30db5a746c	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_CREATED	Oportunidade criada pela cotacao	Cotacao fracionado entrou no pipeline comercial.	{"quoteId": "b58bcd03-2b97-4a91-9133-b95442a64b3a", "quoteCode": "COT-106757", "preContract": true, "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	c6128d55-5786-416b-b274-e87446203ce7	2026-04-29 16:48:16.631	2026-04-29 16:48:16.631
d5dd87e0-a1d2-4e13-91c7-7d1abad0e08c	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_CREATED	Oportunidade criada pela cotacao	Cotacao Fracionado entrou no pipeline comercial.	{"quoteId": "8e786a4c-3ab2-4150-8d8e-949320c8c1c8", "quoteCode": "COT-307124", "preContract": true, "opportunityId": "f8965cd2-689e-4a25-89f9-959ba3558d58"}	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 12:18:28.405	2026-04-30 12:18:28.405
00f3c70a-48a2-4a39-955b-02d78562fc26	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_WON	Oportunidade ganha	A oportunidade "Pre-contrato - Fracionado" foi marcada como ganha.	{"to": "GANHO", "from": "NOVO", "lostReason": null, "opportunityId": "f8965cd2-689e-4a25-89f9-959ba3558d58"}	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 12:37:16.438	2026-04-30 12:37:16.438
8d29c7ef-0158-4268-a148-da17b3172659	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato - fracionado" foi marcada como perdida.	{"to": "PERDIDO", "from": "NOVO", "lostReason": "Não prosseguimos com as negociações.", "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-04-30 12:37:38.601	2026-04-30 12:37:38.601
a2b2da92-015e-4ed6-9953-5b50e285b4f6	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_CREATED	Oportunidade criada pela cotacao	Cotacao Fracionado entrou no pipeline comercial.	{"quoteId": "562ac288-b56c-4ed5-9557-6541cb9303cc", "quoteCode": "COT-494363", "preContract": true, "opportunityId": "88844263-36bc-417e-b5d0-bdbe24f358f4"}	c6128d55-5786-416b-b274-e87446203ce7	2026-04-30 17:19:58.562	2026-04-30 17:19:58.562
84882ea8-1839-4357-b3cd-ed875ecdeb9f	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato - fracionado" foi marcada como perdida.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Não prosseguimos com as negociações.", "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:46:49.761	2026-05-04 12:46:49.761
0ae64a21-e858-43b9-aa7a-fb22ba80c478	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	LEAD_UPDATED	Lead atualizado	Campos atualizados: telefone.	{"changedFields": ["telefone"]}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:47:22.872	2026-05-04 12:47:22.872
9ac5a8f5-eed0-4851-b01b-96cbc595b4c3	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	LEAD_UPDATED	Lead atualizado	Campos atualizados: telefone.	{"changedFields": ["telefone"]}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:47:30.647	2026-05-04 12:47:30.647
7f22327b-17cc-4960-acd3-7d37ef357735	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato - fracionado" foi marcada como perdida.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Não prosseguimos com as negociações.", "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:15.87	2026-05-04 12:48:15.87
2c6af097-b805-4a87-a25f-3a60b218c757	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato - fracionado" foi marcada como perdida.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Não prosseguimos com as negociações.", "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:18.467	2026-05-04 12:48:18.467
d6daeca9-27c0-4432-857e-a9dbb74219a5	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	STAGE_CHANGED	Mudanca de etapa	A oportunidade "Pre-contrato - fracionado" avancou para PROPOSTA.	{"to": "PROPOSTA", "from": "PERDIDO", "lostReason": null, "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:20.941	2026-05-04 12:48:20.941
d188a7c4-f483-4105-915d-0507e0f34616	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato - fracionado" foi marcada como perdida.	{"to": "PERDIDO", "from": "PROPOSTA", "lostReason": "Desistido", "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:48:58.955	2026-05-04 12:48:58.955
aaba34d2-d600-459d-8852-954162d8ee96	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato - fracionado" foi marcada como perdida.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Perda", "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:49:07.066	2026-05-04 12:49:07.066
9b4288b8-afda-4765-a3fb-4aa2b7d58571	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	STAGE_CHANGED	Mudanca de etapa	A oportunidade "Pre-contrato - fracionado" avancou para PROPOSTA.	{"to": "PROPOSTA", "from": "PERDIDO", "lostReason": null, "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-04 12:50:12.132	2026-05-04 12:50:12.132
77e16d30-6c90-4de5-b822-97b17dd17ccd	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	STAGE_CHANGED	Mudanca de etapa	A oportunidade "Pre-contrato - fracionado" avancou para NEGOCIACAO.	{"to": "NEGOCIACAO", "from": "PROPOSTA", "lostReason": null, "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:51:34.71	2026-05-04 12:51:34.71
7a0c62ea-3055-4db6-ad70-7a88a22f9f5b	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	STAGE_CHANGED	Mudanca de etapa	A oportunidade "Pre-contrato - fracionado" avancou para NOVO.	{"to": "NOVO", "from": "NEGOCIACAO", "lostReason": null, "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:51:42.012	2026-05-04 12:51:42.012
c3e876b6-a527-4ce6-8d18-efeeb9283922	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato - fracionado" foi marcada como perdida.	{"to": "PERDIDO", "from": "NOVO", "lostReason": "perdido", "opportunityId": "0ffceb85-c905-4982-a939-929f6ec3e42b"}	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:56:11.664	2026-05-04 12:56:11.664
6f86a213-2664-4f32-9713-5fb851b38653	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_CREATED	Oportunidade criada	A oportunidade "Pre-contrato comercial" foi registrada para Boticário.	{"stage": "PROPOSTA", "opportunityId": "c7ea761d-ab71-4b80-bc67-2ade3b98c523"}	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:56:25.851	2026-05-04 12:56:25.851
ae323145-f20f-4521-8240-49f382c9b864	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Pre-contrato comercial" foi marcada como perdida.	{"to": "PERDIDO", "from": "PROPOSTA", "lostReason": "teste", "opportunityId": "c7ea761d-ab71-4b80-bc67-2ade3b98c523"}	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:56:51.587	2026-05-04 12:56:51.587
30ac8fad-6b5c-4feb-80b2-5f930d34f1fd	1791e0f4-2187-4c2c-a4e1-4e8e404e8973	OPPORTUNITY_CREATED	Oportunidade criada	A oportunidade "Transporte Teste" foi registrada para Boticário.	{"stage": "PROPOSTA", "opportunityId": "92a22ddb-5a5e-42e2-9225-7d10f61535e2"}	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-04 12:57:14.655	2026-05-04 12:57:14.655
4c449855-1d28-4323-a2fa-e17f13474302	193da2cd-18a0-419d-9a27-91978619b1b8	LEAD_CREATED	Lead criado	Lead inicial criado para Natura comestico.	\N	15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	2026-05-05 15:04:29.267	2026-05-05 15:04:29.267
21242af2-ab6c-4e40-b1f7-61e602a500de	193da2cd-18a0-419d-9a27-91978619b1b8	OPPORTUNITY_CREATED	Oportunidade criada pela cotacao	Cotacao Seco entrou no pipeline comercial.	{"quoteId": "8d00b77b-915f-45fd-a2dc-a2fe5a95720e", "quoteCode": "COT-408826", "preContract": false, "opportunityId": "d2a0705b-b10b-41f1-b6b0-612d6c5b53c9"}	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-05 17:27:34.294	2026-05-05 17:27:34.294
897abaa8-b486-4c5a-a492-5a1e4138eb40	193da2cd-18a0-419d-9a27-91978619b1b8	OPPORTUNITY_CREATED	Oportunidade criada pela cotacao	Cotacao Fracionado entrou no pipeline comercial.	{"quoteId": "a61e1a22-79d9-427f-af58-9a5d6585b029", "quoteCode": "COT-549999", "preContract": true, "opportunityId": "96f4823e-5e2c-493e-a61c-844eb71c4d67"}	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:06:24.254	2026-05-06 12:06:24.254
116b2b95-d28e-42aa-94e1-5e228ac1df68	193da2cd-18a0-419d-9a27-91978619b1b8	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Cotacao - Seco" foi marcada como perdida.	{"to": "PERDIDO", "from": "GANHO", "lostReason": "Motivo nao informado.", "opportunityId": "d2a0705b-b10b-41f1-b6b0-612d6c5b53c9"}	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:36:24.49	2026-05-06 12:36:24.49
5622d28f-75b6-4eb8-96d0-8a8ab448728f	193da2cd-18a0-419d-9a27-91978619b1b8	OPPORTUNITY_LOST	Oportunidade perdida	A oportunidade "Cotacao - Seco" foi marcada como perdida.	{"to": "PERDIDO", "from": "PERDIDO", "lostReason": "Motivo nao informado.", "opportunityId": "d2a0705b-b10b-41f1-b6b0-612d6c5b53c9"}	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:36:30.528	2026-05-06 12:36:30.528
1af9df19-ca0b-411f-bd2e-8405b556cbcb	193da2cd-18a0-419d-9a27-91978619b1b8	NOTE_ADDED	Oportunidade editada	Campos atualizados: observacoes do pre-contrato.	{"changedFields": ["observacoes do pre-contrato"], "opportunityId": "d2a0705b-b10b-41f1-b6b0-612d6c5b53c9"}	e586d272-b2df-440c-9a27-5a96c07f3f36	2026-05-06 12:37:26.615	2026-05-06 12:37:26.615
ce6bde50-de90-42db-b92b-6262744ce7f2	193da2cd-18a0-419d-9a27-91978619b1b8	OPPORTUNITY_CREATED	Oportunidade criada pela cotacao	Cotacao Fracionado entrou no pipeline comercial.	{"quoteId": "ba027b37-bdb7-4b71-a3c5-cf47dfd5c319", "quoteCode": "COT-543086", "preContract": true, "opportunityId": "85d138f6-1b76-4562-bec0-cd277a28d423"}	f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	2026-05-06 12:55:43.796	2026-05-06 12:55:43.796
11e7f947-b9d6-4399-94ec-4199b3e919a5	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	LEAD_CREATED	Lead criado	Lead inicial criado para 123456.	\N	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 17:56:13.863	2026-05-06 17:56:13.863
e49235ae-16c4-46a3-803b-c0161d937555	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	OPPORTUNITY_CREATED	Oportunidade criada pela cotacao	Cotacao Fracionado entrou no pipeline comercial.	{"quoteId": "985d9a13-3fe1-49d1-89ff-b969fc5241a3", "quoteCode": "COT-381517", "preContract": false, "opportunityId": "613dba7b-d9af-4516-97f2-2aa96ab01c60"}	fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	2026-05-06 18:01:43.211	2026-05-06 18:01:43.211
9d42637c-dec4-407b-af4b-1ef8a2aa3baa	85a7434d-1b74-40f3-a19b-1f3752ba5ad8	LEAD_UPDATED	Lead atualizado	Campos atualizados: empresa.	{"changedFields": ["empresa"]}	aa44b21d-a846-4615-82a0-8a99f93e07d1	2026-05-06 18:52:25.472	2026-05-06 18:52:25.472
\.


--
-- Data for Name: Tracking; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."Tracking" (id, "clientId", code, origin, destination, carrier, status, description, "estimatedDate", "deliveredAt", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: TrackingHistory; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."TrackingHistory" (id, "trackingId", status, location, description, "createdAt") FROM stdin;
\.


--
-- Data for Name: User; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public."User" (id, name, email, "passwordHash", role, "createdAt", "updatedAt", "isActive", "mustChangePassword") FROM stdin;
d7198ea6-65ec-4fbc-8dbc-173ee6d52b46	Tiago Piz	tiagopzt@teste.com	$2b$10$m17isSAsdQArftI6K3RhUe/gwHYlB0VicguSglbpM4sigMFY30jPG	MARKETING	2026-05-04 13:30:34.474	2026-05-05 15:01:04.547	t	f
aa44b21d-a846-4615-82a0-8a99f93e07d1	Maiara Gonçalvez	maiara.comercial@pizzattolog.com.br	$2b$10$Y1SmnBQh43yLGe5.My7HJORC3IGGXkv3xr0PZfswcjqeUA7IKiuIC	COMERCIAL	2026-04-29 16:57:23.658	2026-05-05 15:01:48.652	t	f
c6128d55-5786-416b-b274-e87446203ce7	Natalia Santos	nathalia.boticario@gmail.com	$2b$10$9dAWpGVoGjdjLBlHsiy4MOpCSsk8qmHn1EW1gXc9z8X50frhxijbS	CLIENTE	2026-04-29 15:23:31.079	2026-05-05 15:02:16.384	t	f
e586d272-b2df-440c-9a27-5a96c07f3f36	Daiane Camila	daiane.camila@pizzattolog.com	$2b$10$huchiVGD2qsiYx0rX4JLG.ZIIHnt/1XQgKdV3W..MXBi3gpSJ9n4K	GESTAO	2026-04-29 12:15:26.755	2026-05-05 15:02:40.161	t	f
15ea2a2c-1a08-4208-bd1b-b2e1f5bbecd9	Caroline Augusto	caroline.augusto@pizzattolog.com.br	$2b$10$XUFlZ/6Nnfo.ox.NTuMwRuKQvfc3QcaEI4e8VrfC8qkou7aIXTjom	ADMIN	2026-04-29 12:15:26.755	2026-05-05 15:02:58.042	t	f
f86a5cc5-3336-4a0b-bad3-e55ebf7e95aa	Natura	natura@natura.com	$2b$10$UzDWYdhe5wQGkK1ggcUoR.ozI3qLa52bDj4HsrMdW2ZIn15LGO3lu	CLIENTE	2026-05-05 15:04:29.267	2026-05-05 17:25:24.829	t	f
fd7f5e14-1bcc-4d5f-a6f3-0674e0354e5b	Lucas Sousa	friboi@gmail.com	$2b$10$jIODJ8mx3h7bYzl006Fmle7/3CEqtIa/CQwd44OZZAAzMhL0dcEOC	CLIENTE	2026-05-06 17:56:13.863	2026-05-06 18:52:25.448	t	f
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
02e4f881-25e1-42d9-a020-4124d5366583	6a8226e578195aa68a519111ddcc61e17f8d18b7b9d63c3e35796dd63afe126e	2026-04-29 10:19:45.448692-03	20260423181058_add_quote_request_details	\N	\N	2026-04-29 10:19:45.441536-03	1
3874721b-28b8-4ac6-81ee-554b0f94ee5d	df9c890513cdf8687dbe22d425dd04bbeb1d62fead0549d70b5fb7c602dbb8fd	2026-04-29 10:19:45.05664-03	20260410180818_init	\N	\N	2026-04-29 10:19:45.026608-03	1
279f8be6-3e28-4c15-90bd-397335f98227	a0f6af60d4cce373339235ce34ad1a9c6f47537d6558b869ba5362f53bcde881	2026-04-29 10:19:45.087564-03	20260410191235_add_client	\N	\N	2026-04-29 10:19:45.05754-03	1
82ed1948-ea68-4803-b651-7e6e293f3d7a	8431d89eaa86aed85e4a8c2f87ca6da0e0ec29b3d4bb1d23eeba8755a7295e64	2026-04-30 08:51:38.415298-03	20260429123000_add_first_login_and_proposta_file	\N	\N	2026-04-30 08:51:38.396409-03	1
bf62da22-55e1-4b04-8c5b-6f2d2549ba41	15dce28360c6cd769cc126ea9241f274116aca1dad3bf7fff3e3afac4cddc095	2026-04-29 10:19:45.137107-03	20260410201541_add_quotes	\N	\N	2026-04-29 10:19:45.088638-03	1
6e3b529e-d969-464e-a132-7db486f1bcf5	5fa3a31c240055d634d097d74a752ffdd6adf13a42580738c115ca9cf32362ed	2026-04-29 10:19:45.619025-03	20260423194500_add_lead_capture_manual_csv_whatsapp	\N	\N	2026-04-29 10:19:45.449882-03	1
dac9fa68-d2c1-4a3f-ab48-abebf2dd1d72	9e281f7f5ad23f4b54a09ea9fb7465ba4140ea9393affe551f328b2a1a50f7c6	2026-04-29 10:19:45.173578-03	20260415202354_y	\N	\N	2026-04-29 10:19:45.138999-03	1
32e9634b-d9d3-489a-8a35-9cbdb809b64c	2d7e307c4ad939f7b6fa64c40b58cf8dec6baed1f56b086c392bde627dfcca36	2026-04-29 10:19:45.181398-03	20260416121832	\N	\N	2026-04-29 10:19:45.174686-03	1
ee175caa-74f0-47b4-87d5-96236d0fcaaa	eb113ddc5181c9ad90ed4232b85de39d508782685d0b87d3bf69cce9e446b4c8	2026-04-29 10:19:45.189457-03	20260416142511_add_client_crm_fields	\N	\N	2026-04-29 10:19:45.182738-03	1
21c7fb79-78dd-4c4f-8f29-04ee4f82736a	88aa72791439ea091837d65199221d929d49e789122cc6a9adfc2ccd5224e7bf	2026-04-29 10:19:45.726588-03	20260427102000_add_commercial_flow_audit_suppliers	\N	\N	2026-04-29 10:19:45.625016-03	1
1d53a943-a842-483f-a6cd-e0304538938e	58abab797263cc5c1de8153f8d4256dbbcd608fc35fa2f00590dc91a0bb02ac6	2026-04-29 10:19:45.215826-03	20260416184241_create_tickets	\N	\N	2026-04-29 10:19:45.19103-03	1
d664cecb-90dd-4cbc-bc68-de497ca9dc55	35e1ff5dd6be36a53a5f9614589c47c7eab0d38a0fcd54e9387f2e95da64dee6	2026-04-29 10:19:45.285697-03	20260420121345_add_tracking_table	\N	\N	2026-04-29 10:19:45.2176-03	1
27919820-cff9-4fc3-be82-fbcdfb6630ca	fbe7dbf19171b954266fb0bb9b7738e4b55a959c5e3d1f4de4ee09bf49a4678a	2026-04-29 10:19:45.289985-03	20260420123134_add_user_is_active	\N	\N	2026-04-29 10:19:45.286668-03	1
ea86e22b-c095-4ddb-96f6-0d67846c47ba	583e77fbe54c5f32fd9205a94aa7080604850aff23b9ca16e63306a3cbfbbcbc	2026-04-29 10:19:45.892087-03	20260427123000_repair_ticket_center_schema	\N	\N	2026-04-29 10:19:45.729308-03	1
c5585056-3414-4e30-b0e1-9d4d15f975f5	59a3e0cc729ba89c8ea7d07679575465a964ced72aae3419cca19a4b624e7d4b	2026-04-29 10:19:45.341351-03	20260422173000_add_audit_logs	\N	\N	2026-04-29 10:19:45.290893-03	1
72789620-d5de-4cb0-839a-d78e39f3215d	2a5f7c2bb1241d7b85f6c9f492cb696f014e474e80af02a0bcd26005822d7ad9	2026-04-29 10:19:45.376669-03	20260422181500_add_portal_content	\N	\N	2026-04-29 10:19:45.342276-03	1
9415bb18-9dd7-45e3-b74a-e867f27900ab	681b2748c451287c652bd80c967523860021a795237a68ac84f55eeb0e3e36fc	2026-04-30 14:09:10.616483-03	20260430103000_fix_commercial_flow_visibility_values	\N	\N	2026-04-30 14:09:10.596857-03	1
a72577c6-c429-4b46-88fe-5fbd87310d57	7cf5fdb9b7a96907a24669f5127f8003f2b8bac860794602f066c4955980b054	2026-04-29 10:19:45.434725-03	20260423150532_add_timeline_events_and_opportunities	\N	\N	2026-04-29 10:19:45.377801-03	1
6f332d7e-a40e-4646-9412-0e8bb8341b9c	9b7bf9b9038a9ddede00e38dbd9276682740b886db159adb42fb290c2a651fb5	2026-04-29 10:19:45.906632-03	20260427124000_ticket_status_defaults	\N	\N	2026-04-29 10:19:45.89385-03	1
50104797-c57a-4e8f-a0a5-f3202abe2f51	55c63ce03acfc8cc16b56f1ba3920ffae7a580ff1f71068d731aedd5078db387	2026-04-29 10:19:45.440498-03	20260423151947_add_portal_content_campaign_fields	\N	\N	2026-04-29 10:19:45.436024-03	1
1b919585-b013-4fe8-a259-2c2af9c13a2c	f73f2497067371466ff04d2c4ee872aa26ab2346cc865ed3ac06f515a4b8a348	2026-04-29 10:19:46.065193-03	20260428115900_adicionar_proposta_log_email	\N	\N	2026-04-29 10:19:45.908586-03	1
df4656cd-bf8b-430a-a273-79315e2d517e	db3ed56835445f9ae41fdc472786f827f79d10d2c7937c633f05eeafffe95f2a	2026-04-30 15:20:34.566412-03	20260430153000_add_secure_chat_module	\N	\N	2026-04-30 15:20:34.192649-03	1
ffd618a8-4f1f-4968-b360-d1daee9bb5e3	7e4d2714843674f6f2706aa85443e8cc78511eb2af3a594a74eecce262b9e328	2026-04-29 10:19:46.086785-03	20260428120000_add_quote_and_proposta_codes	\N	\N	2026-04-29 10:19:46.066218-03	1
d8381885-0fec-4601-b46b-471910ece698	84df4bd06fadf4bd5a5c171dd11e4079200035360925bbbbde9e7725b8213ee2	2026-04-29 10:19:46.142638-03	20260428165000_add_client_deletion_requests	\N	\N	2026-04-29 10:19:46.088427-03	1
fc956d73-4d15-4938-905c-5399874b82ea	2c7a68a787004874f994565ab58fde858e6c7ca126aad7b68360430399d43663	2026-05-06 10:54:42.23631-03	20260506103000_fix_proposta_quote_chat_fields	\N	\N	2026-05-06 10:54:42.033443-03	1
e48038bd-bde9-44e6-bf5a-f634804fd502	8f1a05114c83d94d4604bab95e2922f6fb7114cf35c5455ae0f6b80a2eea369a	2026-05-06 10:55:09.009739-03	20260506135508	\N	\N	2026-05-06 10:55:09.00696-03	1
dab5e8cf-8dd7-4af6-9474-02dda6056f91	aaf3b836ddfb997db172740d73c1aba64edee34c6dc8e5b79a209f5a92b436ba	2026-05-06 15:49:22.169382-03	20260506143000_add_site_entry_prospects	\N	\N	2026-05-06 15:49:21.868311-03	1
\.


--
-- Name: AuditLog AuditLog_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessageRecipient ChatMessageRecipient_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessageRecipient"
    ADD CONSTRAINT "ChatMessageRecipient_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: ChatParticipant ChatParticipant_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_pkey" PRIMARY KEY (id);


--
-- Name: Chat Chat_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_pkey" PRIMARY KEY (id);


--
-- Name: ClientDeletionRequest ClientDeletionRequest_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClientDeletionRequest"
    ADD CONSTRAINT "ClientDeletionRequest_pkey" PRIMARY KEY (id);


--
-- Name: Client Client_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_pkey" PRIMARY KEY (id);


--
-- Name: LeadImportJob LeadImportJob_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadImportJob"
    ADD CONSTRAINT "LeadImportJob_pkey" PRIMARY KEY (id);


--
-- Name: LeadImportRowResult LeadImportRowResult_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadImportRowResult"
    ADD CONSTRAINT "LeadImportRowResult_pkey" PRIMARY KEY (id);


--
-- Name: LeadTimelineEvent LeadTimelineEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadTimelineEvent"
    ADD CONSTRAINT "LeadTimelineEvent_pkey" PRIMARY KEY (id);


--
-- Name: Lead Lead_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_pkey" PRIMARY KEY (id);


--
-- Name: LogEmail LogEmail_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogEmail"
    ADD CONSTRAINT "LogEmail_pkey" PRIMARY KEY (id);


--
-- Name: Notification Notification_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_pkey" PRIMARY KEY (id);


--
-- Name: Opportunity Opportunity_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Opportunity"
    ADD CONSTRAINT "Opportunity_pkey" PRIMARY KEY (id);


--
-- Name: PortalContent PortalContent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PortalContent"
    ADD CONSTRAINT "PortalContent_pkey" PRIMARY KEY (id);


--
-- Name: Proposta Proposta_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Proposta"
    ADD CONSTRAINT "Proposta_pkey" PRIMARY KEY (id);


--
-- Name: Prospect Prospect_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prospect"
    ADD CONSTRAINT "Prospect_pkey" PRIMARY KEY (id);


--
-- Name: QuoteHistory QuoteHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QuoteHistory"
    ADD CONSTRAINT "QuoteHistory_pkey" PRIMARY KEY (id);


--
-- Name: Quote Quote_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Quote"
    ADD CONSTRAINT "Quote_pkey" PRIMARY KEY (id);


--
-- Name: SupplierInvite SupplierInvite_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupplierInvite"
    ADD CONSTRAINT "SupplierInvite_pkey" PRIMARY KEY (id);


--
-- Name: TicketHistory TicketHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketHistory"
    ADD CONSTRAINT "TicketHistory_pkey" PRIMARY KEY (id);


--
-- Name: TicketMessage TicketMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_pkey" PRIMARY KEY (id);


--
-- Name: Ticket Ticket_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_pkey" PRIMARY KEY (id);


--
-- Name: TimelineEvent TimelineEvent_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TimelineEvent"
    ADD CONSTRAINT "TimelineEvent_pkey" PRIMARY KEY (id);


--
-- Name: TrackingHistory TrackingHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TrackingHistory"
    ADD CONSTRAINT "TrackingHistory_pkey" PRIMARY KEY (id);


--
-- Name: Tracking Tracking_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tracking"
    ADD CONSTRAINT "Tracking_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: AuditLog_action_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_action_createdAt_idx" ON public."AuditLog" USING btree (action, "createdAt");


--
-- Name: AuditLog_category_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_category_createdAt_idx" ON public."AuditLog" USING btree (category, "createdAt");


--
-- Name: AuditLog_success_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_success_createdAt_idx" ON public."AuditLog" USING btree (success, "createdAt");


--
-- Name: AuditLog_userId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "AuditLog_userId_createdAt_idx" ON public."AuditLog" USING btree ("userId", "createdAt");


--
-- Name: ChatMessageRecipient_messageId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ChatMessageRecipient_messageId_userId_key" ON public."ChatMessageRecipient" USING btree ("messageId", "userId");


--
-- Name: ChatMessageRecipient_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessageRecipient_userId_idx" ON public."ChatMessageRecipient" USING btree ("userId");


--
-- Name: ChatMessage_authorId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_authorId_createdAt_idx" ON public."ChatMessage" USING btree ("authorId", "createdAt");


--
-- Name: ChatMessage_chatId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_chatId_createdAt_idx" ON public."ChatMessage" USING btree ("chatId", "createdAt");


--
-- Name: ChatMessage_deletedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_deletedAt_idx" ON public."ChatMessage" USING btree ("deletedAt");


--
-- Name: ChatMessage_visibility_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatMessage_visibility_idx" ON public."ChatMessage" USING btree (visibility);


--
-- Name: ChatParticipant_chatId_canWrite_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatParticipant_chatId_canWrite_idx" ON public."ChatParticipant" USING btree ("chatId", "canWrite");


--
-- Name: ChatParticipant_chatId_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "ChatParticipant_chatId_userId_key" ON public."ChatParticipant" USING btree ("chatId", "userId");


--
-- Name: ChatParticipant_userId_canRead_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ChatParticipant_userId_canRead_idx" ON public."ChatParticipant" USING btree ("userId", "canRead");


--
-- Name: Chat_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Chat_clientId_idx" ON public."Chat" USING btree ("clientId");


--
-- Name: Chat_entityType_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Chat_entityType_createdAt_idx" ON public."Chat" USING btree ("entityType", "createdAt");


--
-- Name: Chat_entityType_entityId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Chat_entityType_entityId_key" ON public."Chat" USING btree ("entityType", "entityId");


--
-- Name: Chat_leadId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Chat_leadId_idx" ON public."Chat" USING btree ("leadId");


--
-- Name: Chat_propostaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Chat_propostaId_idx" ON public."Chat" USING btree ("propostaId");


--
-- Name: Chat_quoteId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Chat_quoteId_idx" ON public."Chat" USING btree ("quoteId");


--
-- Name: Chat_ticketId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Chat_ticketId_idx" ON public."Chat" USING btree ("ticketId");


--
-- Name: ClientDeletionRequest_approvedById_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ClientDeletionRequest_approvedById_createdAt_idx" ON public."ClientDeletionRequest" USING btree ("approvedById", "createdAt");


--
-- Name: ClientDeletionRequest_clientId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ClientDeletionRequest_clientId_createdAt_idx" ON public."ClientDeletionRequest" USING btree ("clientId", "createdAt");


--
-- Name: ClientDeletionRequest_requestedById_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ClientDeletionRequest_requestedById_createdAt_idx" ON public."ClientDeletionRequest" USING btree ("requestedById", "createdAt");


--
-- Name: ClientDeletionRequest_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "ClientDeletionRequest_status_createdAt_idx" ON public."ClientDeletionRequest" USING btree (status, "createdAt");


--
-- Name: Client_userId_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Client_userId_key" ON public."Client" USING btree ("userId");


--
-- Name: LeadImportJob_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LeadImportJob_createdAt_idx" ON public."LeadImportJob" USING btree ("createdAt");


--
-- Name: LeadImportJob_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LeadImportJob_status_createdAt_idx" ON public."LeadImportJob" USING btree (status, "createdAt");


--
-- Name: LeadImportRowResult_jobId_rowNumber_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LeadImportRowResult_jobId_rowNumber_idx" ON public."LeadImportRowResult" USING btree ("jobId", "rowNumber");


--
-- Name: LeadImportRowResult_leadId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LeadImportRowResult_leadId_idx" ON public."LeadImportRowResult" USING btree ("leadId");


--
-- Name: LeadTimelineEvent_leadId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LeadTimelineEvent_leadId_createdAt_idx" ON public."LeadTimelineEvent" USING btree ("leadId", "createdAt");


--
-- Name: LeadTimelineEvent_type_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LeadTimelineEvent_type_createdAt_idx" ON public."LeadTimelineEvent" USING btree (type, "createdAt");


--
-- Name: Lead_normalizedEmail_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Lead_normalizedEmail_idx" ON public."Lead" USING btree ("normalizedEmail");


--
-- Name: Lead_normalizedPhone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Lead_normalizedPhone_idx" ON public."Lead" USING btree ("normalizedPhone");


--
-- Name: Lead_source_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Lead_source_createdAt_idx" ON public."Lead" USING btree (source, "createdAt");


--
-- Name: Lead_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Lead_status_createdAt_idx" ON public."Lead" USING btree (status, "createdAt");


--
-- Name: LogEmail_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogEmail_createdAt_idx" ON public."LogEmail" USING btree ("createdAt");


--
-- Name: LogEmail_notificationId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogEmail_notificationId_idx" ON public."LogEmail" USING btree ("notificationId");


--
-- Name: LogEmail_propostaId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogEmail_propostaId_idx" ON public."LogEmail" USING btree ("propostaId");


--
-- Name: LogEmail_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogEmail_status_idx" ON public."LogEmail" USING btree (status);


--
-- Name: LogEmail_ticketId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogEmail_ticketId_idx" ON public."LogEmail" USING btree ("ticketId");


--
-- Name: LogEmail_userId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "LogEmail_userId_idx" ON public."LogEmail" USING btree ("userId");


--
-- Name: Notification_ticketId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_ticketId_createdAt_idx" ON public."Notification" USING btree ("ticketId", "createdAt");


--
-- Name: Notification_userId_readAt_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON public."Notification" USING btree ("userId", "readAt", "createdAt");


--
-- Name: Opportunity_clientId_stage_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Opportunity_clientId_stage_idx" ON public."Opportunity" USING btree ("clientId", stage);


--
-- Name: Opportunity_quoteId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Opportunity_quoteId_idx" ON public."Opportunity" USING btree ("quoteId");


--
-- Name: Opportunity_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Opportunity_status_createdAt_idx" ON public."Opportunity" USING btree (status, "createdAt");


--
-- Name: PortalContent_authorId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PortalContent_authorId_createdAt_idx" ON public."PortalContent" USING btree ("authorId", "createdAt");


--
-- Name: PortalContent_type_isPublished_publishedAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "PortalContent_type_isPublished_publishedAt_idx" ON public."PortalContent" USING btree (type, "isPublished", "publishedAt");


--
-- Name: Proposta_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Proposta_clientId_idx" ON public."Proposta" USING btree ("clientId");


--
-- Name: Proposta_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Proposta_code_key" ON public."Proposta" USING btree (code);


--
-- Name: Proposta_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Proposta_createdAt_idx" ON public."Proposta" USING btree ("createdAt");


--
-- Name: Proposta_opportunityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Proposta_opportunityId_idx" ON public."Proposta" USING btree ("opportunityId");


--
-- Name: Proposta_quoteId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Proposta_quoteId_idx" ON public."Proposta" USING btree ("quoteId");


--
-- Name: Proposta_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Proposta_status_idx" ON public."Proposta" USING btree (status);


--
-- Name: Proposta_ticketId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Proposta_ticketId_idx" ON public."Proposta" USING btree ("ticketId");


--
-- Name: Proposta_ticketId_versao_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Proposta_ticketId_versao_idx" ON public."Proposta" USING btree ("ticketId", versao);


--
-- Name: Prospect_document_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Prospect_document_idx" ON public."Prospect" USING btree (document);


--
-- Name: Prospect_email_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Prospect_email_idx" ON public."Prospect" USING btree (email);


--
-- Name: Prospect_origem_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Prospect_origem_createdAt_idx" ON public."Prospect" USING btree (origem, "createdAt");


--
-- Name: Prospect_statusCadastral_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Prospect_statusCadastral_createdAt_idx" ON public."Prospect" USING btree ("statusCadastral", "createdAt");


--
-- Name: Prospect_telefone_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Prospect_telefone_idx" ON public."Prospect" USING btree (telefone);


--
-- Name: Quote_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Quote_code_key" ON public."Quote" USING btree (code);


--
-- Name: Quote_prospectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Quote_prospectId_idx" ON public."Quote" USING btree ("prospectId");


--
-- Name: SupplierInvite_email_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupplierInvite_email_createdAt_idx" ON public."SupplierInvite" USING btree (email, "createdAt");


--
-- Name: SupplierInvite_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "SupplierInvite_status_createdAt_idx" ON public."SupplierInvite" USING btree (status, "createdAt");


--
-- Name: SupplierInvite_token_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "SupplierInvite_token_key" ON public."SupplierInvite" USING btree (token);


--
-- Name: TicketHistory_createdById_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketHistory_createdById_createdAt_idx" ON public."TicketHistory" USING btree ("createdById", "createdAt");


--
-- Name: TicketHistory_eventType_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketHistory_eventType_createdAt_idx" ON public."TicketHistory" USING btree ("eventType", "createdAt");


--
-- Name: TicketHistory_ticketId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketHistory_ticketId_createdAt_idx" ON public."TicketHistory" USING btree ("ticketId", "createdAt");


--
-- Name: TicketMessage_createdById_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketMessage_createdById_createdAt_idx" ON public."TicketMessage" USING btree ("createdById", "createdAt");


--
-- Name: TicketMessage_ticketId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TicketMessage_ticketId_createdAt_idx" ON public."TicketMessage" USING btree ("ticketId", "createdAt");


--
-- Name: Ticket_assignedToId_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_assignedToId_status_idx" ON public."Ticket" USING btree ("assignedToId", status);


--
-- Name: Ticket_clientId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_clientId_idx" ON public."Ticket" USING btree ("clientId");


--
-- Name: Ticket_internalOnly_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_internalOnly_status_idx" ON public."Ticket" USING btree ("internalOnly", status);


--
-- Name: Ticket_lastInteractionAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_lastInteractionAt_idx" ON public."Ticket" USING btree ("lastInteractionAt");


--
-- Name: Ticket_leadId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_leadId_idx" ON public."Ticket" USING btree ("leadId");


--
-- Name: Ticket_opportunityId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_opportunityId_idx" ON public."Ticket" USING btree ("opportunityId");


--
-- Name: Ticket_origem_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_origem_createdAt_idx" ON public."Ticket" USING btree (origem, "createdAt");


--
-- Name: Ticket_prospectId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_prospectId_idx" ON public."Ticket" USING btree ("prospectId");


--
-- Name: Ticket_protocolo_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_protocolo_idx" ON public."Ticket" USING btree (protocolo);


--
-- Name: Ticket_protocolo_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Ticket_protocolo_key" ON public."Ticket" USING btree (protocolo);


--
-- Name: Ticket_quoteId_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_quoteId_idx" ON public."Ticket" USING btree ("quoteId");


--
-- Name: Ticket_requiresActionRole_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_requiresActionRole_status_idx" ON public."Ticket" USING btree ("requiresActionRole", status);


--
-- Name: Ticket_status_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_status_createdAt_idx" ON public."Ticket" USING btree (status, "createdAt");


--
-- Name: Ticket_type_status_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "Ticket_type_status_idx" ON public."Ticket" USING btree (type, status);


--
-- Name: TimelineEvent_clientId_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TimelineEvent_clientId_createdAt_idx" ON public."TimelineEvent" USING btree ("clientId", "createdAt");


--
-- Name: TimelineEvent_type_createdAt_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX "TimelineEvent_type_createdAt_idx" ON public."TimelineEvent" USING btree (type, "createdAt");


--
-- Name: Tracking_code_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "Tracking_code_key" ON public."Tracking" USING btree (code);


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: AuditLog AuditLog_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."AuditLog"
    ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatMessageRecipient ChatMessageRecipient_messageId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessageRecipient"
    ADD CONSTRAINT "ChatMessageRecipient_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES public."ChatMessage"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessageRecipient ChatMessageRecipient_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessageRecipient"
    ADD CONSTRAINT "ChatMessageRecipient_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatParticipant ChatParticipant_chatId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES public."Chat"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatParticipant ChatParticipant_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ChatParticipant"
    ADD CONSTRAINT "ChatParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chat Chat_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chat Chat_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."Lead"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chat Chat_propostaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES public."Proposta"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chat Chat_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Chat Chat_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Chat"
    ADD CONSTRAINT "Chat_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ClientDeletionRequest ClientDeletionRequest_approvedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClientDeletionRequest"
    ADD CONSTRAINT "ClientDeletionRequest_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClientDeletionRequest ClientDeletionRequest_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClientDeletionRequest"
    ADD CONSTRAINT "ClientDeletionRequest_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ClientDeletionRequest ClientDeletionRequest_requestedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."ClientDeletionRequest"
    ADD CONSTRAINT "ClientDeletionRequest_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Client Client_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Client"
    ADD CONSTRAINT "Client_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LeadImportJob LeadImportJob_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadImportJob"
    ADD CONSTRAINT "LeadImportJob_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeadImportRowResult LeadImportRowResult_jobId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadImportRowResult"
    ADD CONSTRAINT "LeadImportRowResult_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES public."LeadImportJob"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: LeadImportRowResult LeadImportRowResult_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadImportRowResult"
    ADD CONSTRAINT "LeadImportRowResult_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."Lead"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeadTimelineEvent LeadTimelineEvent_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadTimelineEvent"
    ADD CONSTRAINT "LeadTimelineEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LeadTimelineEvent LeadTimelineEvent_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LeadTimelineEvent"
    ADD CONSTRAINT "LeadTimelineEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."Lead"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Lead Lead_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Lead Lead_updatedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Lead"
    ADD CONSTRAINT "Lead_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LogEmail LogEmail_notificationId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogEmail"
    ADD CONSTRAINT "LogEmail_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES public."Notification"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LogEmail LogEmail_propostaId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogEmail"
    ADD CONSTRAINT "LogEmail_propostaId_fkey" FOREIGN KEY ("propostaId") REFERENCES public."Proposta"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LogEmail LogEmail_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogEmail"
    ADD CONSTRAINT "LogEmail_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: LogEmail LogEmail_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."LogEmail"
    ADD CONSTRAINT "LogEmail_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Notification Notification_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Notification"
    ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Opportunity Opportunity_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Opportunity"
    ADD CONSTRAINT "Opportunity_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Opportunity Opportunity_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Opportunity"
    ADD CONSTRAINT "Opportunity_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: PortalContent PortalContent_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."PortalContent"
    ADD CONSTRAINT "PortalContent_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Proposta Proposta_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Proposta"
    ADD CONSTRAINT "Proposta_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Proposta Proposta_criadaPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Proposta"
    ADD CONSTRAINT "Proposta_criadaPorId_fkey" FOREIGN KEY ("criadaPorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Proposta Proposta_enviadaPorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Proposta"
    ADD CONSTRAINT "Proposta_enviadaPorId_fkey" FOREIGN KEY ("enviadaPorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Proposta Proposta_opportunityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Proposta"
    ADD CONSTRAINT "Proposta_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES public."Opportunity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Proposta Proposta_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Proposta"
    ADD CONSTRAINT "Proposta_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Proposta Proposta_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Proposta"
    ADD CONSTRAINT "Proposta_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Prospect Prospect_createdFromTicketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Prospect"
    ADD CONSTRAINT "Prospect_createdFromTicketId_fkey" FOREIGN KEY ("createdFromTicketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: QuoteHistory QuoteHistory_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."QuoteHistory"
    ADD CONSTRAINT "QuoteHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Quote Quote_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Quote"
    ADD CONSTRAINT "Quote_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Quote Quote_prospectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Quote"
    ADD CONSTRAINT "Quote_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES public."Prospect"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: SupplierInvite SupplierInvite_invitedById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."SupplierInvite"
    ADD CONSTRAINT "SupplierInvite_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TicketHistory TicketHistory_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketHistory"
    ADD CONSTRAINT "TicketHistory_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TicketHistory TicketHistory_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketHistory"
    ADD CONSTRAINT "TicketHistory_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TicketMessage TicketMessage_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TicketMessage TicketMessage_ticketId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TicketMessage"
    ADD CONSTRAINT "TicketMessage_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES public."Ticket"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Ticket Ticket_assignedToId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Ticket Ticket_leadId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES public."Lead"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_opportunityId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES public."Opportunity"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_prospectId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_prospectId_fkey" FOREIGN KEY ("prospectId") REFERENCES public."Prospect"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_quoteId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES public."Quote"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: Ticket Ticket_requesterId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Ticket"
    ADD CONSTRAINT "Ticket_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TimelineEvent TimelineEvent_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TimelineEvent"
    ADD CONSTRAINT "TimelineEvent_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: TimelineEvent TimelineEvent_createdById_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TimelineEvent"
    ADD CONSTRAINT "TimelineEvent_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: TrackingHistory TrackingHistory_trackingId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."TrackingHistory"
    ADD CONSTRAINT "TrackingHistory_trackingId_fkey" FOREIGN KEY ("trackingId") REFERENCES public."Tracking"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Tracking Tracking_clientId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public."Tracking"
    ADD CONSTRAINT "Tracking_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES public."Client"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SCHEMA public; Type: ACL; Schema: -; Owner: postgres
--

REVOKE USAGE ON SCHEMA public FROM PUBLIC;


--
-- PostgreSQL database dump complete
--

\unrestrict xZeJ4aDeuIkiZnfJXbEnWWUhiOf5o868W9EMR9HBD7H2oLNZ8zmZW0uWiTCkQ90

