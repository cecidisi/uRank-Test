<?php
header('Access-Control-Allow-Origin: *');
include 'error.php';
if(empty($_POST['data']) || empty($_POST['ext'])){
    return_error('POST parameter missing', 1001);
    exit;
}

$output_dir = "./tests";
if(!file_exists($output_dir)) {
    mkdir($output_dir, 0755, true);
}
chmod($output_dir, 0755);

if(!is_writable($output_dir)) {
    return_error('ERROR no writing permission', 1337);
    exit;
}

$timestamp = date('Y-m-d').'_'.date('h').'-'.date('i').'-'.date('s');
$ext = $_POST['ext'];
$filename = 'test-'.$timestamp.'.'.$ext;
$data = $_POST['data'];
$file = fopen($output_dir.'/'.$filename, 'w') or die('Unable to open file!');

$content =  ($ext == 'json' ? json_encode($data) : $data);
fwrite($file, $content);
fclose($file);
echo "data saved succesfully";

?>
