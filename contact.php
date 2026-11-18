<?php
declare(strict_types=1);

/*
 * Traitement du formulaire de contact du portfolio.
 * Validation côté serveur, anti-spam (champ piège, délai minimal, limite par IP)
 * et protection contre l'injection d'en-têtes e-mail.
 */

const CONTACT_TO      = 'bastienforest01@gmail.com';
const MAIL_FROM       = 'portfolio@glubul.ovh'; // adresse expéditrice : doit appartenir au domaine de l'hébergeur
const MIN_FILL_MS     = 2000;                   // délai minimal entre l'affichage du formulaire et l'envoi
const RATE_LIMIT      = 3;                      // messages autorisés par IP
const RATE_WINDOW_SEC = 600;                    // ... sur cette fenêtre

header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

$wantsJson = isset($_SERVER['HTTP_X_REQUESTED_WITH'])
    || str_contains($_SERVER['HTTP_ACCEPT'] ?? '', 'application/json');

function respond(bool $ok, int $status, string $message, array $errors, bool $json): never
{
    if ($json) {
        http_response_code($status);
        header('Content-Type: application/json; charset=utf-8');
        echo json_encode(['ok' => $ok, 'message' => $message, 'errors' => (object) $errors], JSON_UNESCAPED_UNICODE);
    } else {
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
        header('Location: ' . $base . '/index.html?contact=' . ($ok ? 'ok' : 'error') . '#contact', true, 303);
    }
    exit;
}

function clean_line(string $value): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', ' ', $value) ?? '');
}

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    if (!$wantsJson) {
        $base = rtrim(str_replace('\\', '/', dirname($_SERVER['SCRIPT_NAME'] ?? '/')), '/');
        header('Location: ' . $base . '/index.html#contact', true, 303);
        exit;
    }
    header('Allow: POST');
    respond(false, 405, 'Méthode non autorisée.', [], true);
}

// Refuse les requêtes provenant d'un autre site
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin !== '' && parse_url($origin, PHP_URL_HOST) !== parse_url('//' . ($_SERVER['HTTP_HOST'] ?? ''), PHP_URL_HOST)) {
    respond(false, 403, 'Requête refusée.', [], $wantsJson);
}

// Champ piège : un robot le remplit, un humain ne le voit pas
if (clean_line((string) ($_POST['website'] ?? '')) !== '') {
    respond(true, 200, 'Message envoyé.', [], $wantsJson);
}

$ts = (string) ($_POST['ts'] ?? '');
if (ctype_digit($ts) && (microtime(true) * 1000 - (float) $ts) < MIN_FILL_MS) {
    respond(false, 429, 'Envoi trop rapide, veuillez réessayer dans un instant.', [], $wantsJson);
}

$name    = clean_line((string) ($_POST['name'] ?? ''));
$email   = clean_line((string) ($_POST['email'] ?? ''));
$subject = clean_line((string) ($_POST['subject'] ?? ''));
$message = trim(str_replace("\r\n", "\n", (string) ($_POST['message'] ?? '')));
$message = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $message) ?? '';

$errors = [];
$len = static fn (string $s): int => mb_strlen($s, 'UTF-8');

if ($name === '') {
    $errors['name'] = 'Indiquez votre nom.';
} elseif ($len($name) < 2 || $len($name) > 100) {
    $errors['name'] = 'Le nom doit contenir entre 2 et 100 caractères.';
}

if ($email === '') {
    $errors['email'] = 'Indiquez votre adresse e-mail.';
} elseif ($len($email) > 254 || filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
    $errors['email'] = 'Le format de l’adresse e-mail n’est pas valide.';
}

if ($len($subject) > 150) {
    $errors['subject'] = 'L’objet ne doit pas dépasser 150 caractères.';
}

if ($message === '') {
    $errors['message'] = 'Écrivez votre message.';
} elseif ($len($message) < 10 || $len($message) > 3000) {
    $errors['message'] = 'Le message doit contenir entre 10 et 3000 caractères.';
}

if ($errors) {
    respond(false, 422, 'Le formulaire contient des erreurs.', $errors, $wantsJson);
}

// Limitation du nombre d'envois par adresse IP
$ip      = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$logFile = sys_get_temp_dir() . DIRECTORY_SEPARATOR . 'portfolio_contact_' . hash('sha256', $ip) . '.json';
$now     = time();
$handle  = fopen($logFile, 'c+');

if ($handle !== false && flock($handle, LOCK_EX)) {
    $hits = json_decode((string) stream_get_contents($handle), true);
    $hits = array_values(array_filter(is_array($hits) ? $hits : [], static fn ($t) => is_int($t) && $t > $now - RATE_WINDOW_SEC));

    if (count($hits) >= RATE_LIMIT) {
        flock($handle, LOCK_UN);
        fclose($handle);
        respond(false, 429, 'Trop de messages envoyés. Merci de réessayer dans quelques minutes.', [], $wantsJson);
    }

    $hits[] = $now;
    ftruncate($handle, 0);
    rewind($handle);
    fwrite($handle, json_encode($hits));
    flock($handle, LOCK_UN);
    fclose($handle);
}

$mailSubject = '[Portfolio] ' . ($subject !== '' ? $subject : 'Message de ' . $name);
$body = "Nouveau message depuis le portfolio\r\n"
    . "Nom    : {$name}\r\n"
    . "E-mail : {$email}\r\n"
    . "Date   : " . date('d/m/Y H:i') . "\r\n"
    . str_repeat('-', 40) . "\r\n"
    . str_replace("\n", "\r\n", wordwrap($message, 76, "\n", true)) . "\r\n";

$headers = [
    'From'         => 'Portfolio <' . MAIL_FROM . '>',
    'Reply-To'     => $email,
    'MIME-Version' => '1.0',
    'Content-Type' => 'text/plain; charset=UTF-8',
    'X-Mailer'     => 'PHP/' . PHP_VERSION,
];

$sent = mail(
    CONTACT_TO,
    mb_encode_mimeheader($mailSubject, 'UTF-8'),
    $body,
    $headers,
    '-f' . MAIL_FROM
);

if (!$sent) {
    error_log('contact.php : échec de mail()');
    respond(false, 500, 'L’envoi a échoué. Vous pouvez m’écrire directement à ' . CONTACT_TO . '.', [], $wantsJson);
}

respond(true, 200, 'Message envoyé.', [], $wantsJson);
