package com.rancho.menu;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.DialogInterface;
import android.content.Intent;
import android.graphics.Color;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.webkit.JavascriptInterface;
import android.webkit.JsResult;
import android.webkit.MimeTypeMap;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.util.HashMap;
import java.util.Map;

/** Contenedor WebView: sirve la app desde assets/ y permite importar/exportar archivos. */
public class MainActivity extends Activity {
    private static final String HOST = "appassets.rancho.local";
    private static final int REQ_FILE = 1;

    private WebView web;
    private ValueCallback<Uri[]> fileCallback;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(0xFF16321F);
        getWindow().setNavigationBarColor(0xFFF5EFEB);
        web = new WebView(this);
        web.setBackgroundColor(0xFFF5EFEB);
        setContentView(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);

        web.addJavascriptInterface(new Bridge(), "RanchoApp");
        web.setWebViewClient(new AppClient());
        web.setWebChromeClient(new AppChrome());
        if (state == null) web.loadUrl("https://" + HOST + "/index.html");
        else web.restoreState(state);
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
    }

    // ---- Sirve assets/ como si fuera un sitio https (permite fetch y canvas sin restricciones) ----
    private class AppClient extends WebViewClient {
        @Override
        public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            if (!HOST.equals(u.getHost())) return null;
            String path = u.getPath();
            if (path == null || path.equals("/")) path = "/index.html";
            path = path.substring(1);
            try {
                InputStream in = getAssets().open(path);
                String ext = MimeTypeMap.getFileExtensionFromUrl(path);
                String mime = "application/octet-stream";
                if ("html".equals(ext)) mime = "text/html";
                else if ("js".equals(ext)) mime = "text/javascript";
                else if ("json".equals(ext)) mime = "application/json";
                else if ("svg".equals(ext)) mime = "image/svg+xml";
                else if ("woff2".equals(ext)) mime = "font/woff2";
                else if ("css".equals(ext)) mime = "text/css";
                else if ("png".equals(ext)) mime = "image/png";
                else if ("jpg".equals(ext) || "jpeg".equals(ext)) mime = "image/jpeg";
                Map<String, String> h = new HashMap<String, String>();
                h.put("Cache-Control", "no-cache");
                return new WebResourceResponse(mime, "utf-8", 200, "OK", h, in);
            } catch (IOException e) {
                return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(),
                        new java.io.ByteArrayInputStream(new byte[0]));
            }
        }

        // API 24+: sin @Override porque compilamos contra el android.jar de la API 23
        public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
            Uri u = r.getUrl();
            if (HOST.equals(u.getHost())) return false;
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, u));
            } catch (Exception e) {
                Toast.makeText(MainActivity.this, "No se pudo abrir el enlace", Toast.LENGTH_SHORT).show();
            }
            return true;
        }
    }

    // ---- Selector de archivos y diálogos (alert/confirm) ----
    private class AppChrome extends WebChromeClient {
        @Override
        public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
            if (fileCallback != null) fileCallback.onReceiveValue(null);
            fileCallback = cb;
            boolean images = false;
            for (String t : p.getAcceptTypes()) if (t != null && t.startsWith("image")) images = true;
            Intent i = new Intent(Intent.ACTION_GET_CONTENT);
            i.addCategory(Intent.CATEGORY_OPENABLE);
            i.setType(images ? "image/*" : "*/*");
            try {
                startActivityForResult(Intent.createChooser(i, images ? "Elegir imagen" : "Elegir archivo .zip"), REQ_FILE);
            } catch (Exception e) {
                fileCallback = null;
                return false;
            }
            return true;
        }

        @Override
        public boolean onJsAlert(WebView v, String url, String msg, final JsResult r) {
            new AlertDialog.Builder(MainActivity.this).setMessage(msg).setCancelable(false)
                    .setPositiveButton("Aceptar", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) { r.confirm(); }
                    }).show();
            return true;
        }

        @Override
        public boolean onJsConfirm(WebView v, String url, String msg, final JsResult r) {
            new AlertDialog.Builder(MainActivity.this).setMessage(msg).setCancelable(false)
                    .setPositiveButton("Aceptar", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) { r.confirm(); }
                    })
                    .setNegativeButton("Cancelar", new DialogInterface.OnClickListener() {
                        public void onClick(DialogInterface d, int w) { r.cancel(); }
                    }).show();
            return true;
        }
    }

    @Override
    protected void onActivityResult(int req, int res, Intent data) {
        if (req == REQ_FILE && fileCallback != null) {
            Uri[] out = null;
            if (res == RESULT_OK && data != null && data.getData() != null) out = new Uri[] { data.getData() };
            fileCallback.onReceiveValue(out);
            fileCallback = null;
        }
        super.onActivityResult(req, res, data);
    }

    // ---- Guardar archivos exportados en la carpeta Descargas ----
    public class Bridge {
        private OutputStream out;
        private Uri uri;
        private String name;

        @JavascriptInterface
        public synchronized boolean saveChunk(String fileName, String mime, String base64, boolean first, boolean last) {
            try {
                ContentResolver cr = getContentResolver();
                if (first) {
                    ContentValues v = new ContentValues();
                    v.put("_display_name", fileName);
                    v.put("mime_type", mime == null || mime.length() == 0 ? "application/octet-stream" : mime);
                    v.put("relative_path", "Download/");
                    v.put("is_pending", 1);
                    uri = cr.insert(Uri.parse("content://media/external/downloads"), v);
                    if (uri == null) return false;
                    out = cr.openOutputStream(uri);
                    name = fileName;
                }
                if (out == null) return false;
                out.write(Base64.decode(base64, Base64.DEFAULT));
                if (last) {
                    out.close();
                    out = null;
                    ContentValues v = new ContentValues();
                    v.put("is_pending", 0);
                    cr.update(uri, v, null, null);
                    final String shown = name;
                    runOnUiThread(new Runnable() {
                        public void run() {
                            Toast.makeText(MainActivity.this, "Guardado en Descargas: " + shown, Toast.LENGTH_LONG).show();
                        }
                    });
                }
                return true;
            } catch (Exception e) {
                try { if (out != null) out.close(); } catch (IOException ignored) { }
                out = null;
                runOnUiThread(new Runnable() {
                    public void run() {
                        Toast.makeText(MainActivity.this, "No se pudo guardar el archivo", Toast.LENGTH_LONG).show();
                    }
                });
                return false;
            }
        }
    }
}
