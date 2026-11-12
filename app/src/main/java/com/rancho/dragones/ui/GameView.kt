package com.rancho.dragones.ui

import android.content.Context
import android.graphics.Canvas
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.Path
import android.graphics.RectF
import android.graphics.Shader
import android.view.Choreographer
import android.view.MotionEvent
import android.view.View
import kotlin.math.abs

/**
 * Única vista del juego. Escala un lienzo virtual de 360 de ancho, dibuja la
 * pestaña activa con su barra superior (recursos) e inferior (navegación) y
 * reenvía los toques a la interfaz.
 */
class GameView(context: Context, private val game: Game) : View(context) {
    private class Tab(val label: String, val screen: Screen, val glyph: (Canvas, Float, Float, Int) -> Unit)

    private val ui = Ui()
    private val paint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val path = Path()

    private val city = CityScreen()
    private val hatchery = HatcheryScreen()
    private val battle = BattleScreen()
    private val collection = CollectionScreen()
    private val shop = ShopScreen()

    private val tabs = listOf(
        Tab("Ciudad", city, this::glyphHouse),
        Tab("Criadero", hatchery, this::glyphEgg),
        Tab("Batalla", battle, this::glyphSwords),
        Tab("Colección", collection, this::glyphList),
        Tab("Tienda", shop, this::glyphCoin),
    )
    private var current = 0

    private val topH = 46f
    private val navH = 58f
    private var startNanos = 0L
    private var lastTick = 0L
    private var lastSave = 0L
    private var running = false

    // gestos
    private var downX = 0f
    private var downY = 0f
    private var lastY = 0f
    private var dragging = false
    private var scale = 1f

    private val frame = object : Choreographer.FrameCallback {
        override fun doFrame(frameTimeNanos: Long) {
            if (!running) return
            invalidate()
            Choreographer.getInstance().postFrameCallback(this)
        }
    }

    fun start() {
        if (running) return
        running = true
        if (startNanos == 0L) startNanos = System.nanoTime()
        game.tick()
        Choreographer.getInstance().postFrameCallback(frame)
    }

    fun stop() {
        running = false
        game.tick()
        game.save()
    }

    fun selectTab(i: Int) {
        current = i.coerceIn(0, tabs.size - 1)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        start()
    }

    override fun onDetachedFromWindow() {
        stop()
        super.onDetachedFromWindow()
    }

    override fun onDraw(canvas: Canvas) {
        render(canvas, width.toFloat(), height.toFloat(), (System.nanoTime() - startNanos) / 1e9f)
    }

    /** Dibuja un fotograma completo. Separado para poder probarlo sin ventana. */
    fun render(canvas: Canvas, widthPx: Float, heightPx: Float, t: Float) {
        scale = widthPx / VIRTUAL_W
        val vw = VIRTUAL_W
        val vh = heightPx / scale

        val nowMs = game.now()
        if (nowMs - lastTick >= 1000) {
            game.tick()
            lastTick = nowMs
        }
        if (nowMs - lastSave >= 20_000) {
            if (lastSave != 0L) game.save()
            lastSave = nowMs
        }

        canvas.save()
        canvas.scale(scale, scale)
        ui.begin(canvas, vw, vh)

        val tab = tabs[current]
        paint.shader = LinearGradient(0f, 0f, 0f, vh, tab.screen.bgTop, tab.screen.bgBottom, Shader.TileMode.CLAMP)
        canvas.drawRect(0f, 0f, vw, vh, paint)
        paint.shader = null

        val area = RectF(0f, topH + 4f, vw, vh - navH - 4f)
        canvas.save()
        canvas.clipRect(area)
        tab.screen.draw(ui, game, area, t)
        canvas.restore()

        drawTopBar(vw)
        drawNav(vw, vh)
        drawToast(vw, vh)
        canvas.restore()
    }

    private fun drawTopBar(vw: Float) {
        val s = game.state
        paint.color = 0xE6221633.toInt()
        ui.c.drawRect(0f, 0f, vw, topH, paint)
        val chipW = (vw - 40f) / 3
        fun chip(i: Int, icon: (Float, Float) -> Unit, value: String) {
            val l = 10f + i * (chipW + 10f)
            val r = RectF(l, 8f, l + chipW, topH - 8f)
            ui.panel(r, 0x55FFFFFF, radius = 15f)
            icon(l + 15f, r.centerY())
            ui.text(value, l + 30f, r.centerY() + 5f, 14f, 0xFFFFFFFF.toInt(), bold = true, maxW = chipW - 36f)
        }
        chip(0, { x, y -> ui.coin(x, y, 9f) }, s.gold.toString())
        chip(1, { x, y -> ui.gem(x, y, 9f) }, s.gems.toString())
        chip(2, { x, y -> ui.food(x, y, 8f) }, s.food.toString())
    }

    private fun drawNav(vw: Float, vh: Float) {
        val top = vh - navH
        paint.color = 0xF2221633.toInt()
        ui.c.drawRect(0f, top, vw, vh, paint)
        val tw = vw / tabs.size
        tabs.forEachIndexed { i, tab ->
            val sel = i == current
            val l = i * tw
            val r = RectF(l + 3f, top + 4f, l + tw - 3f, vh - 4f)
            if (sel) ui.panel(r, 0x33FFFFFF, radius = 12f)
            val col = if (sel) 0xFFFFFFFF.toInt() else 0xFF9D93B8.toInt()
            tab.glyph(ui.c, r.centerX(), top + 22f, col)
            ui.text(tab.label, r.centerX(), vh - 10f, 11f, col, Paint.Align.CENTER, sel, maxW = tw - 6f)
            if (tab.screen.badge(game)) {
                paint.color = 0xFFFF4D4D.toInt()
                ui.c.drawCircle(r.right - 12f, top + 12f, 5f, paint)
            }
            ui.hit(r) { current = i }
        }
    }

    private fun drawToast(vw: Float, vh: Float) {
        val msg = game.currentToast() ?: return
        val w = (ui.measure(msg, 14f, true) + 32f).coerceAtMost(vw - 20f)
        val r = RectF((vw - w) / 2, vh - navH - 52f, (vw + w) / 2, vh - navH - 18f)
        ui.panel(r, 0xEE221633.toInt(), 0xFFFFFFFF.toInt(), 17f)
        ui.text(msg, r.centerX(), r.centerY() + 5f, 14f, 0xFFFFFFFF.toInt(), Paint.Align.CENTER, true, maxW = w - 20f)
    }

    // ---------- Iconos de la barra ----------

    private fun glyphHouse(c: Canvas, x: Float, y: Float, col: Int) {
        paint.color = col
        c.drawRect(x - 9f, y - 2f, x + 9f, y + 10f, paint)
        path.reset(); path.moveTo(x - 13f, y - 1f); path.lineTo(x, y - 12f); path.lineTo(x + 13f, y - 1f); path.close()
        c.drawPath(path, paint)
    }

    private fun glyphEgg(c: Canvas, x: Float, y: Float, col: Int) {
        paint.color = col
        c.drawOval(x - 8f, y - 12f, x + 8f, y + 11f, paint)
    }

    private fun glyphSwords(c: Canvas, x: Float, y: Float, col: Int) {
        paint.color = col
        paint.style = Paint.Style.STROKE
        paint.strokeWidth = 3.5f
        paint.strokeCap = Paint.Cap.ROUND
        c.drawLine(x - 10f, y - 10f, x + 10f, y + 10f, paint)
        c.drawLine(x + 10f, y - 10f, x - 10f, y + 10f, paint)
        paint.style = Paint.Style.FILL
    }

    private fun glyphList(c: Canvas, x: Float, y: Float, col: Int) {
        paint.color = col
        for (i in -1..1) c.drawRoundRect(x - 11f, y + i * 8f - 2f, x + 11f, y + i * 8f + 2f, 2f, 2f, paint)
    }

    private fun glyphCoin(c: Canvas, x: Float, y: Float, col: Int) {
        paint.color = col
        c.drawCircle(x, y, 11f, paint)
        paint.color = 0xFF221633.toInt()
        c.drawCircle(x, y, 6f, paint)
        paint.color = col
        c.drawCircle(x, y, 3f, paint)
    }

    // ---------- Entrada ----------

    override fun onTouchEvent(e: MotionEvent): Boolean {
        val x = e.x / scale
        val y = e.y / scale
        when (e.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                downX = x; downY = y; lastY = y; dragging = false
            }
            MotionEvent.ACTION_MOVE -> {
                if (!dragging && (abs(x - downX) > 8f || abs(y - downY) > 8f)) dragging = true
                if (dragging) {
                    ui.onDrag(downX, downY, y - lastY)
                    lastY = y
                }
            }
            MotionEvent.ACTION_UP -> {
                if (!dragging) {
                    ui.onTap(x, y)
                    performClick()
                }
            }
        }
        return true
    }

    override fun performClick(): Boolean {
        super.performClick()
        return true
    }

    companion object {
        const val VIRTUAL_W = 360f
    }
}
