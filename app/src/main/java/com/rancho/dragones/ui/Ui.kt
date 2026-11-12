package com.rancho.dragones.ui

import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Typeface
import kotlin.math.max
import kotlin.math.min

/** Paleta de la interfaz. */
object Pal {
    val panel = 0xFFFFF8E7.toInt()
    val panelDark = 0xFF3A2A5C.toInt()
    val ink = 0xFF3B2A1A.toInt()
    val inkSoft = 0xFF7A6A58.toInt()
    val green = 0xFF4CAF50.toInt()
    val red = 0xFFE5534B.toInt()
    val blue = 0xFF3F8FE0.toInt()
    val gold = 0xFFFFC107.toInt()
    val gem = 0xFFB04CFF.toInt()
    val disabled = 0xFFB9B2A8.toInt()
}

class BtnSpec(val label: String, val enabled: Boolean = true, val color: Int = Pal.green, val action: () -> Unit)

/**
 * Interfaz en modo inmediato: cada fotograma se dibuja todo y se registran las
 * zonas táctiles; el toque se resuelve contra las zonas del fotograma anterior.
 */
class Ui {
    lateinit var c: Canvas
    var w = 360f
    var h = 640f

    private class Hit(val r: RectF, val action: (() -> Unit)?)
    private class Region(val key: String, val r: RectF, val maxScroll: Float)

    private var hits = ArrayList<Hit>()
    private var prevHits = ArrayList<Hit>()
    private var regions = ArrayList<Region>()
    private var prevRegions = ArrayList<Region>()
    private val scrolls = HashMap<String, Float>()
    private var offY = 0f
    private var clip: RectF? = null

    private val p = Paint(Paint.ANTI_ALIAS_FLAG)
    private val stroke = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.STROKE }
    private val tp = Paint(Paint.ANTI_ALIAS_FLAG)
    private val tmp = RectF()
    private val path = Path()

    fun begin(canvas: Canvas, width: Float, height: Float) {
        c = canvas
        w = width
        h = height
        val th = prevHits; prevHits = hits; hits = th; hits.clear()
        val tr = prevRegions; prevRegions = regions; regions = tr; regions.clear()
        offY = 0f
        clip = null
    }

    // ---------- Texto y formas ----------

    fun measure(s: String, size: Float, bold: Boolean = false): Float {
        tp.textSize = size
        tp.typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        return tp.measureText(s)
    }

    /** Dibuja texto; si no cabe en `maxW` lo reduce y, como último recurso, lo recorta. */
    fun text(
        s: String, x: Float, y: Float, size: Float, color: Int = Pal.ink,
        align: Paint.Align = Paint.Align.LEFT, bold: Boolean = false, maxW: Float = 0f,
    ) {
        var sz = size
        var str = s
        if (maxW > 0f) {
            while (sz > size * 0.7f && measure(str, sz, bold) > maxW) sz -= 0.5f
            while (str.length > 1 && measure(str, sz, bold) > maxW) str = str.dropLast(2).trimEnd() + "…"
        }
        tp.textSize = sz
        tp.typeface = if (bold) Typeface.DEFAULT_BOLD else Typeface.DEFAULT
        tp.color = color
        tp.textAlign = align
        c.drawText(str, x, y, tp)
    }

    fun panel(r: RectF, fill: Int, border: Int = 0, radius: Float = 12f) {
        p.style = Paint.Style.FILL
        p.color = fill
        c.drawRoundRect(r, radius, radius, p)
        if (border != 0) {
            stroke.color = border
            stroke.strokeWidth = 2f
            c.drawRoundRect(r, radius, radius, stroke)
        }
    }

    fun rect(l: Float, t: Float, r: Float, b: Float): RectF = RectF(l, t, r, b)

    fun bar(r: RectF, frac: Float, color: Int, back: Int = 0x66000000) {
        panel(r, back, radius = r.height() / 2)
        if (frac > 0f) {
            tmp.set(r.left, r.top, r.left + max(r.height(), r.width() * frac.coerceIn(0f, 1f)), r.bottom)
            panel(tmp, color, radius = r.height() / 2)
        }
    }

    // ---------- Iconos ----------

    fun coin(x: Float, y: Float, r: Float) {
        p.style = Paint.Style.FILL
        p.color = 0xFFE09A00.toInt(); c.drawCircle(x, y, r, p)
        p.color = Pal.gold; c.drawCircle(x, y, r * 0.82f, p)
        p.color = 0xFFFFE680.toInt(); c.drawCircle(x - r * 0.2f, y - r * 0.2f, r * 0.32f, p)
    }

    fun gem(x: Float, y: Float, r: Float) {
        path.reset()
        path.moveTo(x, y - r); path.lineTo(x + r * 0.9f, y - r * 0.1f); path.lineTo(x, y + r)
        path.lineTo(x - r * 0.9f, y - r * 0.1f); path.close()
        p.style = Paint.Style.FILL
        p.color = Pal.gem; c.drawPath(path, p)
        path.reset()
        path.moveTo(x, y - r); path.lineTo(x + r * 0.3f, y - r * 0.1f); path.lineTo(x, y + r * 0.7f)
        path.lineTo(x - r * 0.3f, y - r * 0.1f); path.close()
        p.color = 0xFFE3B8FF.toInt(); c.drawPath(path, p)
    }

    fun food(x: Float, y: Float, r: Float) {
        p.style = Paint.Style.FILL
        p.color = 0xFFD64545.toInt(); c.drawCircle(x, y + r * 0.1f, r * 0.9f, p)
        p.color = 0xFFFF8A80.toInt(); c.drawCircle(x - r * 0.3f, y - r * 0.15f, r * 0.28f, p)
        p.color = Pal.green; c.drawOval(x, y - r * 1.15f, x + r * 0.8f, y - r * 0.55f, p)
    }

    // ---------- Botones y zonas táctiles ----------

    private fun register(r: RectF, action: (() -> Unit)?) {
        val rr = RectF(r)
        rr.offset(0f, -offY)
        val cl = clip
        if (cl != null && !rr.intersect(cl)) return
        hits.add(Hit(rr, action))
    }

    fun button(r: RectF, label: String, enabled: Boolean = true, color: Int = Pal.green, onClick: () -> Unit) {
        val fill = if (enabled) color else Pal.disabled
        tmp.set(r.left, r.top + 3f, r.right, r.bottom + 3f)
        panel(tmp, if (enabled) darken(color) else 0xFF8C857B.toInt(), radius = 10f)
        panel(r, fill, radius = 10f)
        text(
            label, r.centerX(), r.centerY() + 5f, 13f, Color.WHITE, Paint.Align.CENTER, true,
            maxW = r.width() - 8f,
        )
        register(r) { if (enabled) onClick() }
    }

    fun button(r: RectF, spec: BtnSpec) = button(r, spec.label, spec.enabled, spec.color, spec.action)

    /** Zona táctil invisible. */
    fun hit(r: RectF, onClick: () -> Unit) = register(r, onClick)

    /** Absorbe los toques de una zona sin hacer nada (para modales). */
    fun block(r: RectF) = register(r, null)

    fun darken(color: Int): Int =
        Color.rgb((Color.red(color) * 0.7f).toInt(), (Color.green(color) * 0.7f).toInt(), (Color.blue(color) * 0.7f).toInt())

    // ---------- Scroll ----------

    /** Empieza una zona con scroll. El contenido se dibuja con coordenadas de contenido (empezando en r.top). */
    fun beginScroll(key: String, r: RectF, contentH: Float) {
        val maxScroll = max(0f, contentH - r.height())
        val off = (scrolls[key] ?: 0f).coerceIn(0f, maxScroll)
        scrolls[key] = off
        regions.add(Region(key, RectF(r), maxScroll))
        c.save()
        c.clipRect(r)
        c.translate(0f, -off)
        offY = off
        clip = RectF(r)
    }

    fun endScroll() {
        c.restore()
        offY = 0f
        clip = null
    }

    // ---------- Filas de lista y modales ----------

    /** Fila estándar con icono a la izquierda, dos líneas de texto y botones a la derecha. */
    fun listRow(
        r: RectF, title: String, subtitle: String, vararg buttons: BtnSpec,
        icon: ((Canvas, Float, Float) -> Unit)? = null,
    ) {
        panel(r, Pal.panel, 0xFFE3D3B0.toInt())
        val iconW = if (icon != null) r.height() else 8f
        icon?.invoke(c, r.left + iconW / 2, r.centerY() + 4f)
        val btnW = if (buttons.isEmpty()) 0f else 84f
        val textX = r.left + iconW + 4f
        val textW = r.right - btnW - 10f - textX
        text(title, textX, r.top + 22f, 15f, Pal.ink, bold = true, maxW = textW)
        text(subtitle, textX, r.top + 40f, 11.5f, Pal.inkSoft, maxW = textW)
        if (buttons.isNotEmpty()) {
            val n = buttons.size
            val bh = min(30f, (r.height() - 8f - (n - 1) * 4f) / n)
            val total = n * bh + (n - 1) * 4f
            var y = r.centerY() - total / 2
            for (b in buttons) {
                button(RectF(r.right - btnW - 6f, y, r.right - 6f, y + bh), b)
                y += bh + 4f
            }
        }
    }

    /** Ventana modal centrada. Devuelve el área interior (bajo el título). */
    fun modal(title: String, height: Float, onClose: () -> Unit): RectF {
        val full = RectF(0f, 0f, w, h)
        p.style = Paint.Style.FILL
        p.color = 0xB0000000.toInt()
        c.drawRect(full, p)
        block(full)
        hit(full, onClose) // tocar fuera cierra, pero el panel de abajo lo absorbe
        val mh = min(height, h - 40f)
        val r = RectF(14f, (h - mh) / 2, w - 14f, (h + mh) / 2)
        panel(r, Pal.panel, 0xFF8A6E3A.toInt(), 16f)
        block(r)
        text(title, r.centerX(), r.top + 28f, 18f, Pal.ink, Paint.Align.CENTER, true, maxW = r.width() - 70f)
        val close = RectF(r.right - 40f, r.top + 8f, r.right - 8f, r.top + 40f)
        button(close, "X", color = Pal.red, onClick = onClose)
        return RectF(r.left + 10f, r.top + 48f, r.right - 10f, r.bottom - 10f)
    }

    // ---------- Entrada ----------

    fun onTap(x: Float, y: Float) {
        for (i in prevHits.indices.reversed()) {
            val hit = prevHits[i]
            if (hit.r.contains(x, y)) {
                hit.action?.invoke()
                return
            }
        }
    }

    fun onDrag(x: Float, y: Float, dy: Float) {
        for (i in prevRegions.indices.reversed()) {
            val reg = prevRegions[i]
            if (reg.r.contains(x, y)) {
                scrolls[reg.key] = ((scrolls[reg.key] ?: 0f) - dy).coerceIn(0f, reg.maxScroll)
                return
            }
        }
    }
}
