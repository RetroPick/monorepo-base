package com.retropick.core.notification

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import com.retropick.core.model.WhaleSignal

class WhaleAlertNotificationManager(private val context: Context) {
    companion object {
        private const val CHANNEL_ID = "whale_alerts_channel"
        private const val CHANNEL_NAME = "Smart Money Whale Alerts"
    }

    init {
        createNotificationChannel()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                CHANNEL_NAME,
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "High-notional whale trade alerts for followed traders"
            }
            val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            notificationManager.createNotificationChannel(channel)
        }
    }

    fun triggerWhaleAlert(signal: WhaleSignal) {
        val notificationManager = context.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager

        val title = "🐋 Whale Alert: ${signal.traderPseudonym ?: signal.traderAddress.take(8)}"
        val body = "Placed $${signal.notionalUsd} on ${signal.outcomeLabel} in '${signal.marketQuestion}' (WhaleScore: ${signal.whaleScore})"

        val builder = NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(title)
            .setContentText(body)
            .setPriority(NotificationCompat.PRIORITY_HIGH)
            .setAutoCancel(true)

        notificationManager.notify(signal.signalId.hashCode(), builder.build())
    }
}
