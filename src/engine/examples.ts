/* ══════════ exemplos — dados puros ══════════ */

export interface Example {
    name: string;
    code: string;
}

export const EXAMPLES: Example[] = [
    {
        name: 'E-commerce', code:
            `erDiagram
        USUARIO ||--o{ PEDIDO : realiza
        USUARIO ||--o{ CARRINHO : possui
        PEDIDO ||--|{ ITEM_PEDIDO : contem
        PRODUTO ||--o{ ITEM_PEDIDO : e_comprado
        PRODUTO ||--o{ CARRINHO_ITEM : esta_em
        CARRINHO ||--o{ CARRINHO_ITEM : contem
        PEDIDO ||--|| ENDERECO : entrega_em
        USUARIO ||--o{ ENDERECO : tem
        USUARIO ||..o{ AVALIACAO : faz
        PRODUTO ||..o{ AVALIACAO : recebe
        CATEGORIA ||--o{ PRODUTO : organiza
        PRODUTO ||--o{ IMAGEM : possui
        PEDIDO ||--|| STATUS_PEDIDO : tem

        USUARIO {
    int id PK
    string email UK
    string senha
    string nome
    string telefone
    datetime data_criacao
        }
        PEDIDO {
    int id PK
    int usuario_id FK
    int endereco_id FK
    decimal total
    datetime criado_em
        }
        ITEM_PEDIDO {
    int id PK
    int pedido_id FK
    int produto_id FK
    int quantidade
    decimal preco_unitario
        }
        PRODUTO {
    int id PK
    int categoria_id FK
    string nome
    string slug UK
    decimal preco
    int estoque
        }
        CATEGORIA {
    int id PK
    string nome UK
    int categoria_pai_id FK
        }
        CARRINHO {
    int id PK
    int usuario_id FK
    datetime atualizado_em
        }
        CARRINHO_ITEM {
    int id PK
    int carrinho_id FK
    int produto_id FK
    int quantidade
        }
        ENDERECO {
    int id PK
    int usuario_id FK
    string logradouro
    string cidade
    string uf
    string cep
        }
        STATUS_PEDIDO {
    int id PK
    string nome UK
        }
        AVALIACAO {
    int id PK
    int usuario_id FK
    int produto_id FK
    int nota
    text comentario
        }
        IMAGEM {
    int id PK
    int produto_id FK
    string url
    string alt
        }`},
    {
        name: 'Fluxo de pedido', code:
            `flowchart TD
        P[Pedido criado] --> E{Estoque disponível?}
        E -->|sim| PG[Processar pagamento]
        E -->|não| CA[Carrinho aguardando]
        PG --> F[Pedido faturado] --> ENV[Envio preparado]
        PG -.->|falha| CA
        CA --> E`,
    },
    {
        name: 'Autenticação (seq.)', code:
            `sequenceDiagram
        participant U as Usuário
        participant A as API
        participant D as Banco de Dados
        U ->> A: login(email, senha)
        A ->> D: buscar usuário
        D -->> A: registro + hash
        A ->> A: verificar senha
        A -->> U: token JWT`,
    },
    {
        name: 'Veículos (classes)', code:
            `classDiagram
        Veiculo <|-- Carro
        Veiculo <|-- Moto
        Veiculo *-- Motor
        Motor --|> Peca
        class Veiculo {
    +String placa
    +ligar()
    +mover()
        }
        class Carro {
    +int portas
    +abrirPortaMalas()
        }
        class Moto {
    +empinar()
        }
        class Motor {
    +int cilindradas
        }
        class Peca {
    +String codigo
        }`},
    {
        name: 'Distribuição de tempo (pizza)', code:
            `pieDiagram
        title Distribuição do tempo da squad
        "Produto" : 34
        "Suporte" : 22
        "Vendas" : 18
        "Marketing" : 12
        "Infra" : 9
        "Pesquisa" : 5`,
    },
    {
        name: 'Mapa mental', code:
            `mindmap
        root((Sistema))
            Frontend
                Web App
                Mobile
            Backend
                API REST
                Workers
            Dados
                PostgreSQL
                Cache`,
    },
    {
        name: 'Contexto C4', code:
            `C4Context
        title Plataforma de cursos
        Person(aluno, "Aluno", "Consome os cursos")
        System(web, "Portal Web", "SPA React")
        SystemDb(db, "Banco de Dados", "PostgreSQL")
        Container(api, "API", "Node.js", "Serve os dados do catálogo")
        Rel(aluno, web, "Usa", "HTTPS")
        Rel(web, api, "Consulta", "JSON/HTTPS")
        Rel(api, db, "Lê e escreve", "SQL")`,
    },
];
