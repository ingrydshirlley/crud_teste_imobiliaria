const express = require('express');
const server = express();
const mysql = require('mysql');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // Especifique o diretório onde os arquivos serão armazenados
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        // Gere nomes de arquivos únicos, ou personalize conforme necessário
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

server.use(express.json());

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '41424128',
    database: 'db_imobiliaria_2024'
});

connection.connect();

//GET
//retorna todos os imoveis:
server.get('/imoveis', (req, res) => {
    const query = `
        SELECT
            i.*,
            GROUP_CONCAT(DISTINCT f.foto) AS fotos,
            GROUP_CONCAT(DISTINCT v.video) AS videos
        FROM
            tbl_imoveis i
        LEFT JOIN tbl_fotos f ON i.id = f.imovel_id
        LEFT JOIN tbl_videos v ON i.id = v.imovel_id
        GROUP BY
            i.id
    `;

    connection.query(query, (error, results) => {
        if (error) {
            console.error('Erro na consulta SQL:', error);
            res.status(500).json({ error: 'Erro ao obter imóveis' });
        } else {
            // Transforme as strings em arrays
            results.forEach(result => {
                result.fotos = result.fotos ? result.fotos.split(',') : [];
                result.videos = result.videos ? result.videos.split(',') : [];
            });

            res.json(results);
        }
    });
});

//retorna um imovel:
server.get('/imoveis/:id', (req, res) => {
    const imovelId = req.params.id;

    // Consulta para obter informações básicas do imóvel
    const queryImovel = 'SELECT * FROM imoveis WHERE id = ?';

    connection.query(queryImovel, [imovelId], (errorImovel, resultsImovel) => {
        if (errorImovel) {
            console.error(errorImovel);
            res.status(500).json({ error: 'Erro ao obter informações do imóvel' });
        } else {
            if (resultsImovel.length === 0) {
                res.status(404).json({ error: 'Imóvel não encontrado' });
            } else {
                const imovel = resultsImovel[0];

                // Consulta para obter fotos associadas ao imóvel
                const queryFotos = 'SELECT * FROM fotos WHERE imovel_id = ?';

                connection.query(queryFotos, [imovelId], (errorFotos, resultsFotos) => {
                    if (errorFotos) {
                        console.error(errorFotos);
                        res.status(500).json({ error: 'Erro ao obter fotos do imóvel' });
                    } else {
                        // Consulta para obter vídeos associados ao imóvel
                        const queryVideos = 'SELECT * FROM videos WHERE imovel_id = ?';

                        connection.query(queryVideos, [imovelId], (errorVideos, resultsVideos) => {
                            if (errorVideos) {
                                console.error(errorVideos);
                                res.status(500).json({ error: 'Erro ao obter vídeos do imóvel' });
                            } else {
                                // Adiciona fotos e vídeos ao objeto do imóvel
                                imovel.fotos = resultsFotos;
                                imovel.videos = resultsVideos;

                                res.json(imovel);
                            }
                        });
                    }
                });
            }
        }
    });
});


//POST
//cria um imovel
server.post("/imoveis", upload.fields([{ name: 'fotos' }, { name: 'videos' }]), (req, res) => {
    const {
        descricao,
        preco,
        tipo,
        cidade,
        estado,
        numero,
        bairro,
        rua,
        cep,
        ambientes,
        metros,
        categoria
    } = req.body;

    const fotos = req.files['fotos'];
    const videos = req.files['videos'];

    // Insira os dados na tabela 'imoveis'
    connection.query(
        'INSERT INTO tbl_imoveis (descricao, preco, tipo, cidade, estado, numero, bairro, rua, cep, ambientes, metros, categoria) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [descricao, preco, tipo, cidade, estado, numero, bairro, rua, cep, ambientes, metros, categoria],
        (error, results) => {
            if (error) {
                res.status(500).json({ error: 'Erro ao criar imóvel' });
            } else {
                const imovelId = results.insertId;

                // Insira os dados na tabela 'fotos'
                if (fotos) {
                    const fotosValues = fotos.map(foto => [imovelId, foto.path]);
                    connection.query(
                        'INSERT INTO tbl_fotos (imovel_id, foto) VALUES ?',
                        [fotosValues],
                        (errorFotos) => {
                            if (errorFotos) {
                                console.error(errorFotos);
                                res.status(500).json({ error: 'Erro ao adicionar fotos ao imóvel' });
                            }
                        }
                    );
                }

                // Insira os dados na tabela 'videos'
                if (videos) {
                    const videosValues = videos.map(video => [imovelId, video.path]);
                    connection.query(
                        'INSERT INTO tbl_videos (imovel_id, video) VALUES ?',
                        [videosValues],
                        (errorVideos) => {
                            if (errorVideos) {
                                console.error(errorVideos);
                                res.status(500).json({ error: 'Erro ao adicionar vídeos ao imóvel' });
                            }
                        }
                    );
                }

                res.json({ message: 'Imóvel criado com sucesso' });
            }
        }
    );
});

//PUT
//atualiza um imovel
server.put("/imoveis/:id", upload.fields([{ name: 'fotos' }, { name: 'videos' }]), (req, res) => {
    const imovelId = req.params.id;

    const {
        descricao,
        preco,
        tipo,
        cidade,
        estado,
        numero,
        bairro,
        rua,
        cep,
        ambientes,
        metros,
        categoria
    } = req.body;

    const fotos = req.files['fotos'];
    const videos = req.files['videos'];

    // Atualiza os dados na tabela 'imoveis'
    connection.query(
        'UPDATE imoveis SET descricao=?, preco=?, tipo=?, cidade=?, estado=?, numero=?, bairro=?, rua=?, cep=?, ambientes=?, metros=?, categoria=? WHERE id=?',
        [descricao, preco, tipo, cidade, estado, numero, bairro, rua, cep, ambientes, metros, categoria, imovelId],
        (error) => {
            if (error) {
                res.status(500).json({ error: 'Erro ao atualizar imóvel' });
            } else {
                // Remove fotos existentes do imóvel
                connection.query('DELETE FROM fotos WHERE imovel_id=?', [imovelId], (errorDeleteFotos) => {
                    if (errorDeleteFotos) {
                        console.error(errorDeleteFotos);
                        res.status(500).json({ error: 'Erro ao remover fotos antigas do imóvel' });
                    } else {
                        // Insere as novas fotos, se houver
                        if (fotos) {
                            const fotosValues = fotos.map(foto => [imovelId, foto.path]);
                            connection.query(
                                'INSERT INTO fotos (imovel_id, foto_path) VALUES ?',
                                [fotosValues],
                                (errorInsertFotos) => {
                                    if (errorInsertFotos) {
                                        console.error(errorInsertFotos);
                                        res.status(500).json({ error: 'Erro ao adicionar novas fotos ao imóvel' });
                                    }
                                }
                            );
                        }

                        // Remove vídeos existentes do imóvel
                        connection.query('DELETE FROM videos WHERE imovel_id=?', [imovelId], (errorDeleteVideos) => {
                            if (errorDeleteVideos) {
                                console.error(errorDeleteVideos);
                                res.status(500).json({ error: 'Erro ao remover vídeos antigos do imóvel' });
                            } else {
                                // Insere os novos vídeos, se houver
                                if (videos) {
                                    const videosValues = videos.map(video => [imovelId, video.path]);
                                    connection.query(
                                        'INSERT INTO videos (imovel_id, video_path) VALUES ?',
                                        [videosValues],
                                        (errorInsertVideos) => {
                                            if (errorInsertVideos) {
                                                console.error(errorInsertVideos);
                                                res.status(500).json({ error: 'Erro ao adicionar novos vídeos ao imóvel' });
                                            }
                                        }
                                    );
                                }

                                res.json({ message: 'Imóvel atualizado com sucesso' });
                            }
                        });
                    }
                });
            }
        }
    );
});


//DELETE
//deleta um imovel
server.delete("/imoveis/:id", (req, res) => {
    const imovelId = req.params.id;

    // Remove fotos associadas ao imóvel
    connection.query('DELETE FROM fotos WHERE imovel_id=?', [imovelId], (errorDeleteFotos) => {
        if (errorDeleteFotos) {
            console.error(errorDeleteFotos);
            res.status(500).json({ error: 'Erro ao remover fotos do imóvel' });
        } else {
            // Remove vídeos associados ao imóvel
            connection.query('DELETE FROM videos WHERE imovel_id=?', [imovelId], (errorDeleteVideos) => {
                if (errorDeleteVideos) {
                    console.error(errorDeleteVideos);
                    res.status(500).json({ error: 'Erro ao remover vídeos do imóvel' });
                } else {
                    // Remove o próprio imóvel
                    connection.query('DELETE FROM imoveis WHERE id=?', [imovelId], (errorDeleteImovel) => {
                        if (errorDeleteImovel) {
                            console.error(errorDeleteImovel);
                            res.status(500).json({ error: 'Erro ao remover imóvel' });
                        } else {
                            res.json({ message: 'Imóvel removido com sucesso' });
                        }
                    });
                }
            });
        }
    });
});



process.on('SIGINT', () => {
    connection.end();
    process.exit();
});


server.listen(3000, () => {
    console.log('Servidor está rodando na porta 3000');
});