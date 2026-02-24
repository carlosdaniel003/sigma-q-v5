<?php
// Permite que seu localhost (Next.js) acesse este arquivo (CORS)
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

// Tenta achar o arquivo de conexão da TI
if (file_exists("conexao.php")) {
    include("conexao.php");
} elseif (file_exists("../conexao.php")) {
    include("../conexao.php");
} elseif (file_exists("../../conexao.php")) {
    include("../../conexao.php");
} else {
    http_response_code(500);
    echo json_encode(["erro" => "Arquivo conexao.php não encontrado no servidor."]);
    exit;
}

// Verifica se a variável de conexão da TI existe
if (!isset($conexao1) || !$conexao1) {
    http_response_code(500);
    echo json_encode(["erro" => "Falha na conexão herdada: " . mysqli_connect_error()]);
    exit;
}

// Força UTF-8 para não quebrar acentos
mysqli_set_charset($conexao1, "utf8");

// =========================================================
// 🚀 QUERY DA PRODUÇÃO (OFICIAL)
// Filtra pela coluna DATA pegando tudo de 2026 para frente
// =========================================================
$sql = "SELECT id, DATA, HORA, MATNR, MAKTX, TIPO_PROD, FABRICA, QUANTIDADE, TIPO_MOV FROM plano_mao WHERE DATA >= '2026-01-01' ORDER BY DATA DESC";

$resultado = mysqli_query($conexao1, $sql);
$dados = array();

if ($resultado) {
    while ($linha = mysqli_fetch_assoc($resultado)) {
        $dados[] = $linha;
    }
} else {
    $dados = ["erro" => "Erro na query: " . mysqli_error($conexao1)];
}

// Cospe os dados na tela em formato JSON
echo json_encode($dados);
?>