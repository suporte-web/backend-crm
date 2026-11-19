CREATE TYPE "OrigemSegmento" AS ENUM ('CNAE', 'MANUAL', 'IMPORTACAO', 'LEGADO');
CREATE TABLE "Segmento" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "codigo" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "aliases" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL
);
CREATE UNIQUE INDEX "Segmento_codigo_key" ON "Segmento"("codigo");
CREATE UNIQUE INDEX "Segmento_nome_key" ON "Segmento"("nome");
CREATE TABLE "RegraSegmentoCnae" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "prefixo" TEXT NOT NULL,
  "descricao" TEXT,
  "segmentoId" TEXT NOT NULL,
  "ativa" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RegraSegmentoCnae_segmentoId_fkey" FOREIGN KEY ("segmentoId") REFERENCES "Segmento"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "RegraSegmentoCnae_prefixo_key" ON "RegraSegmentoCnae"("prefixo");
CREATE INDEX "RegraSegmentoCnae_segmentoId_idx" ON "RegraSegmentoCnae"("segmentoId");
ALTER TABLE "Client" ADD COLUMN "segmentoId" TEXT,
  ADD COLUMN "segmentoOrigem" "OrigemSegmento",
  ADD COLUMN "chaveImportacao" TEXT,
  ADD COLUMN "siteUrl" TEXT;
CREATE INDEX "Client_segmentoId_idx" ON "Client"("segmentoId");
CREATE UNIQUE INDEX "Client_chaveImportacao_key" ON "Client"("chaveImportacao");
ALTER TABLE "Client" ADD CONSTRAINT "Client_segmentoId_fkey" FOREIGN KEY ("segmentoId") REFERENCES "Segmento"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
UPDATE "Client" SET "segmentoOrigem" = 'LEGADO' WHERE NULLIF(TRIM("segment"), '') IS NOT NULL;
CREATE TABLE "ImportacaoCadastro" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "arquivo" TEXT NOT NULL,
  "hashArquivo" TEXT NOT NULL,
  "aba" TEXT NOT NULL,
  "usuarioId" TEXT NOT NULL,
  "responsavelId" TEXT NOT NULL,
  "empresaConsultoraId" TEXT,
  "linhas" JSONB NOT NULL,
  "resultado" JSONB,
  "status" TEXT NOT NULL DEFAULT 'PREVIA',
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "ImportacaoCadastro_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportacaoCadastro_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "ImportacaoCadastro_empresaConsultoraId_fkey" FOREIGN KEY ("empresaConsultoraId") REFERENCES "EmpresaConsultora"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "ImportacaoCadastro_usuarioId_createdAt_idx" ON "ImportacaoCadastro"("usuarioId", "createdAt");
CREATE INDEX "ImportacaoCadastro_empresaConsultoraId_createdAt_idx" ON "ImportacaoCadastro"("empresaConsultoraId", "createdAt");

-- Catalogo inicial comercial, com regras de CNAE revisaveis pela gestao.
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('2222b257-c48e-4777-8396-50586bed9b82','alimentos','Alimentos',ARRAY['IND ALIMENTOS','DISTRIB ALIMENTOS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('b0ff1f45-d68e-4d8e-8c38-c30db7dfb6ed','10','2222b257-c48e-4777-8396-50586bed9b82',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('a1515dbd-a283-412d-89f8-0e91fe3505fe','bebidas','Bebidas',ARRAY['IND BEBIDAS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('f1446c93-c9ca-4087-87c4-fa01ca533b1e','11','a1515dbd-a283-412d-89f8-0e91fe3505fe',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('c9f906ec-ebae-4b3a-8470-bbe0002457ae','farmaceutico','Farmacêutico',ARRAY['Fármaco','IND FARMACEUTICA','VAREJO FARMACEUTICO','DISTRIB MEDICAMENTOS','IND PET MEDICAMENTOS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('03dfe320-8b09-44f1-8849-f923731708b7','21','c9f906ec-ebae-4b3a-8470-bbe0002457ae',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('0cac49ad-3121-47bc-8e6e-5ee5728939ba','46443','c9f906ec-ebae-4b3a-8470-bbe0002457ae',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('2c2f275d-f431-44e3-82fc-04c78a042da1','47717','c9f906ec-ebae-4b3a-8470-bbe0002457ae',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('daf440de-8b6a-421c-8631-9009d0360b7f','farmoquimico','Farmoquímico',ARRAY['FARMOQUIMICA','IND FARMOQUIMICO']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('9aceb23a-37f5-40be-8e68-ae4e06c88950','211','daf440de-8b6a-421c-8631-9009d0360b7f',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('bb2b3f81-8c58-4d29-8dbf-7d97635c4e90','quimico','Químico',ARRAY['IND QUIMICA','IND AGROQUIMICO']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('d1609252-3b18-4480-87c0-91b1aff5a96c','20','bb2b3f81-8c58-4d29-8dbf-7d97635c4e90',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('7a30cfe5-134e-4482-8da6-aef280e88645','higiene-limpeza','Higiene e limpeza',ARRAY['Higiene/Limpeza','IND HIGIENE LIMPEZA']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('d05c8385-2941-4efb-8df2-1841f24468e9','20614','7a30cfe5-134e-4482-8da6-aef280e88645',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('5d104e79-7c5b-47b2-8f68-f336819f325b','20622','7a30cfe5-134e-4482-8da6-aef280e88645',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('4f640bcd-c332-4fa5-81c8-021a3d019fff','cosmeticos','Cosméticos e higiene pessoal',ARRAY['Cosmético/Perfumaria','IND HPPC','VAREJO HPPC','IND PET HPPC']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('857c5590-4a48-4f3e-83c5-96bcea5a07bf','20631','4f640bcd-c332-4fa5-81c8-021a3d019fff',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('afa3c2b9-560f-4bdf-8cdc-fcc307591f36','embalagens','Embalagens',ARRAY['Embalagem','IND EMBALAGENS']::TEXT[],NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('0a3cd453-a91a-4a08-8aad-1fcce25a7b2f','automotivo','Automotivo',ARRAY['IND PNEUS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('565d6e6d-d315-486b-8406-8d43f3523547','29','0a3cd453-a91a-4a08-8aad-1fcce25a7b2f',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('fbc4b36b-dd2f-440c-8c3c-447b9997f06d','45','0a3cd453-a91a-4a08-8aad-1fcce25a7b2f',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('7b3215b1-e20c-4168-8040-47fa5ee4b307','varejo','Varejo',ARRAY['VAREJO ESPORTIVO','LOJAS DE CONVENIENCIA']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('a42806dc-63d7-455a-84d2-d668e7a0c3c8','47','7b3215b1-e20c-4168-8040-47fa5ee4b307',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('aa65dc92-a58e-4e8f-89c7-97257ea124da','atacado','Atacado e distribuição',ARRAY['Distribuição','DISTRIB ELETRONICOS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('b384a0e9-4c1a-4425-86f1-69ce1b0ed643','46','aa65dc92-a58e-4e8f-89c7-97257ea124da',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('66f4ad15-39e5-4310-821a-89968824695f','supermercados','Supermercados',ARRAY['Supermercado']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('40a7d574-84e7-4906-8907-28ea4e980e05','47113','66f4ad15-39e5-4310-821a-89968824695f',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('f7a7d802-9b71-4b7b-80f0-232a7743b46f','ecommerce','E-commerce',ARRAY['E commerce','Comércio eletrônico']::TEXT[],NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('dc598019-d150-4937-84dd-68bd029e2142','bens-consumo','Bens de consumo',ARRAY['Bens de Consumo']::TEXT[],NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('354d3bd6-5ee2-4ca0-8f57-7dbd25378ec5','pet','Pet',ARRAY['IND PET ALIMENTOS ACESS','VAREJO PET']::TEXT[],NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('7fb5d592-4c7f-47b7-8a08-badef2f5ea53','saude-correlatos','Saúde e correlatos',ARRAY['Fármaco Correlatos','IND DE CORRELATOS','IND EPI S','IND ODONTOLOGICA','LAB ANALISES CLINICAS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('b7701c35-8b4c-45df-8828-e7ba096b1721','86','7fb5d592-4c7f-47b7-8a08-badef2f5ea53',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('da0c2bca-4a57-4dec-84c1-b7130d575a93','insumos','Insumos',ARRAY[]::TEXT[],NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('952c4ebd-7cb4-4430-8171-07a8d1c1e0ab','textil','Têxtil e vestuário',ARRAY['Têxteis','IND TEXTIL']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('e36bb164-8a07-4ba5-8678-dea3dfb78f62','13','952c4ebd-7cb4-4430-8171-07a8d1c1e0ab',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('dc2a047d-b53a-4134-87ce-f3fae4e46c34','14','952c4ebd-7cb4-4430-8171-07a8d1c1e0ab',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('7e3323b3-592f-41fd-8c15-12b34d460e50','papel','Papel e celulose',ARRAY[]::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('eb4941ee-0f6c-4e9e-83a6-920a7c30e641','17','7e3323b3-592f-41fd-8c15-12b34d460e50',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('28ad2a82-4122-4398-893a-fd549fd9461e','grafico','Gráficas e editoras',ARRAY['GRAFICAS EDITORAS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('a45f818f-d40d-40b9-8182-85188c36e0ac','18','28ad2a82-4122-4398-893a-fd549fd9461e',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('f1bd6fe8-76aa-47c4-86c1-3f0a921969e4','58','28ad2a82-4122-4398-893a-fd549fd9461e',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('d98b9520-8ada-44f1-8a04-034a6d4a4482','eletronicos','Eletrônicos e equipamentos',ARRAY['IND ELETRONICOS','IND ELETROELETRONICOS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('424065aa-f88d-4c74-8dde-7926f62689d5','26','d98b9520-8ada-44f1-8a04-034a6d4a4482',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('da551d90-0951-48f3-8b03-28b77db6820c','27','d98b9520-8ada-44f1-8a04-034a6d4a4482',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('f6cae5c2-c5ec-43fc-8906-50e9adfa7055','borracha-plastico','Borracha e plástico',ARRAY[]::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('d8517df4-6292-4acc-885f-64e7b178bb89','22','f6cae5c2-c5ec-43fc-8906-50e9adfa7055',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('fc17f8ec-7299-48b5-89a9-17e1f5b751b6','construcao','Construção',ARRAY[]::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('8d9ff2d9-df1e-494c-8860-99fca2b2d2e8','41','fc17f8ec-7299-48b5-89a9-17e1f5b751b6',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('7760a312-da2d-431f-8e1b-9ef3e88d4d00','42','fc17f8ec-7299-48b5-89a9-17e1f5b751b6',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('8dd9f94d-841a-4f46-87ed-185065bdbb3e','43','fc17f8ec-7299-48b5-89a9-17e1f5b751b6',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('ec66416f-8c6a-40d4-8c17-464df8f45ca2','transporte-logistica','Transporte e logística',ARRAY['PORTOS','AEROPORTOS','SUBCONTRATADOS']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('d3b1265e-51fb-4c9c-8870-78c2d3b3fe4b','49','ec66416f-8c6a-40d4-8c17-464df8f45ca2',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('18b99f9f-94a6-4557-8e8e-f5886706e40c','50','ec66416f-8c6a-40d4-8c17-464df8f45ca2',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('0206dd38-111e-4888-85a4-995063e915c5','51','ec66416f-8c6a-40d4-8c17-464df8f45ca2',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('2c72d91a-33da-4831-8f95-092684e6127e','52','ec66416f-8c6a-40d4-8c17-464df8f45ca2',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('4f137fa8-472e-4c50-8057-29c236d7aa2c','53','ec66416f-8c6a-40d4-8c17-464df8f45ca2',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('92493703-9428-447f-8b05-cd24c0dc2170','agro','Agropecuária',ARRAY[]::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('ec73a070-5f30-4561-83f9-5c5f7c09d09d','01','92493703-9428-447f-8b05-cd24c0dc2170',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('59aa5bc8-9422-45e7-8a12-33ff88d8baac','02','92493703-9428-447f-8b05-cd24c0dc2170',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('206bd478-2023-4e27-81d6-9847775869e8','03','92493703-9428-447f-8b05-cd24c0dc2170',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('d156ae15-80e9-4be9-8456-169f503f6fca','servicos','Serviços',ARRAY[]::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('c79d07a2-5015-4061-8187-380a5171f0e1','62','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('0ed3cab3-8715-4010-83f6-13fe6f22a5f8','63','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('38d2a2cc-d243-404d-813b-7a0bb7d75c08','69','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('28d982d5-04b2-4324-8b08-d2ddc6532e06','70','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('62cf7995-0cef-4334-8539-74a0e96760c8','71','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('c7061711-ef7b-4823-8b45-776289597fd0','73','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('2ae55309-e729-4aba-8c2e-3e85d2916bcc','74','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('7e79e07d-a56c-4c37-8dda-617874d83bf2','77','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('fcbe8988-2e35-44df-883e-8593b5c62f59','78','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('0016e358-8e2d-4a75-8f38-85098f764836','79','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('2c4e7b59-b3d0-4f75-8de6-d543d2d17ed7','80','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('3984bce4-5433-4821-8a28-e306c04ada88','81','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('e3af2ef6-70f0-4653-8096-6dcfc55adbb4','82','d156ae15-80e9-4be9-8456-169f503f6fca',NOW());
INSERT INTO "Segmento" (id,codigo,nome,aliases,"updatedAt") VALUES ('a1b30e50-4fd6-4311-8e14-1ac3ac9eadaf','governo','Administração pública',ARRAY['GOVERNO']::TEXT[],NOW());
INSERT INTO "RegraSegmentoCnae" (id,prefixo,"segmentoId","updatedAt") VALUES ('391c03ca-f459-45a0-89ed-990763a8ac2d','84','a1b30e50-4fd6-4311-8e14-1ac3ac9eadaf',NOW());
