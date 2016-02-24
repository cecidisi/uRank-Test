<?php
function return_error($message, $code) {
    header('HTTP/1.1 500 Internal Server Error -- '.$message);
    header('Content-Type: application/json; charset=UTF-8');
    die(json_encode(array('message' => 'ERROR '.$message, 'code' => $code)));
    echo 'ERROR -- '.$message;
}
?>
