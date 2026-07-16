package me.drownek.example;

import org.bukkit.Bukkit;
import org.bukkit.Material;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.inventory.Inventory;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.ItemMeta;
import org.bukkit.plugin.java.JavaPlugin;

public final class ExamplePlugin extends JavaPlugin implements CommandExecutor, Listener {

    @Override
    public void onEnable() {
        this.getCommand("example").setExecutor(this);
        this.getCommand("warps").setExecutor(this);
        getServer().getPluginManager().registerEvents(this, this);
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!sender.hasPermission("example.gui-settings")) {
            sender.sendMessage("You don't have permission to execute this command! (example) (MISSING_PERMISSIONS)");
            return true;
        }

        if (command.getName().equalsIgnoreCase("warps")) {
            if (sender instanceof Player player) {
                openWarps(player, 1);
            }
            return true;
        }

        if (args.length > 0 && args[0].equalsIgnoreCase("gui-settings")) {
            if (sender instanceof Player player) {
                openGuiSettings(player);
            } else {
                sender.sendMessage("This command can only be executed by a player.");
            }
            return true;
        }

        return false;
    }

    private void openWarps(Player player, int page) {
        Inventory gui = Bukkit.createInventory(null, 9, "Warps");

        if (page == 1) {
            ItemStack spawn = new ItemStack(Material.COMPASS);
            ItemMeta spawnMeta = spawn.getItemMeta();
            spawnMeta.setDisplayName("Spawn");
            spawn.setItemMeta(spawnMeta);
            gui.setItem(0, spawn);

            ItemStack arrow = new ItemStack(Material.ARROW);
            ItemMeta arrowMeta = arrow.getItemMeta();
            arrowMeta.setDisplayName("arrow");
            arrow.setItemMeta(arrowMeta);
            gui.setItem(8, arrow);
        } else if (page == 2) {
            ItemStack arena = new ItemStack(Material.DIAMOND_SWORD);
            ItemMeta arenaMeta = arena.getItemMeta();
            arenaMeta.setDisplayName("Arena");
            arena.setItemMeta(arenaMeta);
            gui.setItem(0, arena);
        }

        player.openInventory(gui);
    }

    private void openGuiSettings(Player player) {
        Inventory gui = Bukkit.createInventory(null, 9, "guiSettings");

        ItemStack guiItem = new ItemStack(Material.DIAMOND);
        ItemMeta meta = guiItem.getItemMeta();
        if (meta != null) {
            meta.setDisplayName("guiItemInfo");
            guiItem.setItemMeta(meta);
        }
        gui.setItem(4, guiItem);

        player.openInventory(gui);
    }

    @EventHandler
    public void onInventoryClick(InventoryClickEvent event) {
        if (!(event.getWhoClicked() instanceof Player player)) {
            return;
        }

        String title = event.getView().getTitle();
        if (title.equals("Warps")) {
            event.setCancelled(true);
            ItemStack clickedItem = event.getCurrentItem();
            if (clickedItem == null) return;
            ItemMeta meta = clickedItem.getItemMeta();
            if (meta != null && meta.hasDisplayName() && meta.getDisplayName().equals("arrow")) {
                openWarps(player, 2);
            }
            return;
        }

        if (!title.equals("guiSettings")) {
            return;
        }

        event.setCancelled(true);

        ItemStack clickedItem = event.getCurrentItem();
        if (clickedItem == null || clickedItem.getType() == Material.AIR) {
            return;
        }

        ItemMeta meta = clickedItem.getItemMeta();
        if (meta == null || !meta.hasDisplayName()) {
            return;
        }

        String displayName = meta.getDisplayName();
        if (displayName.contains("guiItemInfo")) {
            player.sendMessage("You clicked on item");
        }
    }
}
