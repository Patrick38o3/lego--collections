(() => {
      "use strict";

      const STORAGE_KEY_PREFIX = "lego-collection-v1";
      const LOGIN_PASSPHRASE = "lego2026";
      const loginOverlay = document.getElementById("login-overlay");
      const loginForm = document.getElementById("login-form");
      const loginUsername = document.getElementById("login-username");
      const loginPassword = document.getElementById("login-password");
      const loginError = document.getElementById("login-error");
      const appMain = document.getElementById("app-main");
      const currentUserLabel = document.getElementById("current-user");
      const form = document.getElementById("set-form");
      const list = document.getElementById("collection-list");
      const count = document.getElementById("collection-count");
      const formMessage = document.getElementById("form-message");
      const totalStat = document.getElementById("stat-total");
      const piecesStat = document.getElementById("stat-pieces");
      const costStat = document.getElementById("stat-cost");
      const backupMessage = document.getElementById("backup-message");
      const importFile = document.getElementById("import-file");
      const searchInput = document.getElementById("collection-search");
      const seriesFilter = document.getElementById("series-filter");
      const fieldNames = ["name", "number", "series", "pieceCount", "price", "notes"];
      const seriesSelect = form.elements.series;
      const customSeriesInput = form.elements.customSeries;
      const customSeriesLabel = document.getElementById("custom-series-label");
      let currentUser = "";
      let sets = [];

      function getStorageKey() {
        return `${STORAGE_KEY_PREFIX}_${currentUser}`;
      }

      function loadSets() {
        try {
          const saved = localStorage.getItem(getStorageKey());
          if (saved === null) {
            return [];
          }

          const parsed = JSON.parse(saved);
          if (!Array.isArray(parsed)) {
            throw new TypeError("收藏数据不是数组");
          }

          return parsed.filter((item) => item && typeof item === "object" && !Array.isArray(item));
        } catch (error) {
          console.warn(`无法读取用户 ${currentUser} 的乐高收藏数据，已使用空列表。`, error);
          return [];
        }
      }

      function saveSets(nextSets) {
        try {
          localStorage.setItem(getStorageKey(), JSON.stringify(nextSets));
          sets = nextSets;
          renderSets();
          formMessage.textContent = "";
          return true;
        } catch (error) {
          console.warn("无法保存乐高收藏数据。", error);
          formMessage.textContent = "保存失败，请检查浏览器的本地存储设置后重试。";
          return false;
        }
      }

      function getValue(name) {
        return form.elements[name].value.trim();
      }

      function getSeriesValue() {
        return seriesSelect.value === "其他" ? customSeriesInput.value.trim() : seriesSelect.value;
      }

      function updateCustomSeriesField() {
        const isCustom = seriesSelect.value === "其他";
        customSeriesInput.hidden = !isCustom;
        customSeriesLabel.hidden = !isCustom;
        customSeriesInput.required = isCustom;
        if (!isCustom) {
          customSeriesInput.removeAttribute("aria-invalid");
        }
      }

      function setError(name, message) {
        if (name === "series") {
          const error = document.getElementById("series-error");
          error.textContent = message;
          const missingSelection = !seriesSelect.value;
          const missingCustomName = seriesSelect.value === "其他" && customSeriesInput.value.trim() === "";
          seriesSelect.toggleAttribute("aria-invalid", Boolean(message) && missingSelection);
          customSeriesInput.toggleAttribute("aria-invalid", Boolean(message) && missingCustomName);
          return;
        }

        const input = form.elements[name];
        const error = document.getElementById(`${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}-error`);
        if (!error) {
          return;
        }

        error.textContent = message;
        if (message) {
          input.setAttribute("aria-invalid", "true");
        } else {
          input.removeAttribute("aria-invalid");
        }
      }

      function validate() {
        let valid = true;
        const requiredFields = [
          ["name", "请输入套装名称。"],
          ["number", "请输入套装编号。"]
        ];

        requiredFields.forEach(([name, message]) => {
          const missing = getValue(name) === "";
          setError(name, missing ? message : "");
          valid = valid && !missing;
        });

        const missingSeries = !seriesSelect.value || (seriesSelect.value === "其他" && customSeriesInput.value.trim() === "");
        setError("series", missingSeries ? (seriesSelect.value === "其他" ? "请输入自定义系列名称。" : "请选择套装系列。") : "");
        valid = valid && !missingSeries;

        const pieceCount = getValue("pieceCount");
        const validPieceCount = /^[1-9]\d*$/.test(pieceCount);
        setError("pieceCount", validPieceCount ? "" : "请输入大于或等于 1 的正整数。");
        valid = valid && validPieceCount;

        const price = getValue("price");
        const validPrice = price === "" || /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(price);
        setError("price", validPrice ? "" : "请输入非负数字，最多包含一个小数点。");
        valid = valid && validPrice;

        setError("notes", "");
        return valid;
      }

      function createId() {
        return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      }

      function enterUser(userName) {
        currentUser = userName;
        currentUserLabel.textContent = currentUser;
        loginOverlay.hidden = true;
        appMain.hidden = false;
        sets = loadSets();
        updateCustomSeriesField();
        renderSets();
      }

      function showBackupMessage(message, isError = false) {
        backupMessage.textContent = message;
        backupMessage.classList.toggle("error", isError);
      }

      function exportData() {
        const headers = ["名称", "编号", "系列", "零件数", "入手价", "状态", "备注"];
        const rows = sets.map((set) => [
          set.name,
          set.number,
          set.series,
          set.pieceCount,
          set.price,
          set.status,
          set.notes
        ]);
        const escapeCsvValue = (value) => `"${String(value ?? "").replace(/"/g, '""')}"`;
        const csv = [headers, ...rows]
          .map((row) => row.map(escapeCsvValue).join(","))
          .join("\r\n");
        const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "lego-collection.csv";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showBackupMessage("CSV 数据已导出。");
      }

      function exportJson() {
        const blob = new Blob([JSON.stringify(sets, null, 2)], { type: "application/json;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = "lego-backup.json";
        link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
        showBackupMessage("JSON 数据已导出。");
      }

      function validateImportedSet(item, index) {
        if (!item || typeof item !== "object" || Array.isArray(item)
          || typeof item.name !== "string" || !item.name.trim()
          || typeof item.number !== "string" || !item.number.trim()
          || typeof item.series !== "string" || !item.series.trim()
          || !Number.isInteger(Number(item.pieceCount)) || Number(item.pieceCount) < 1) {
          throw new TypeError(`第 ${index + 1} 条记录缺少有效的名称、编号、系列或零件数。`);
        }

        const price = item.price ?? "";
        if (price !== "" && (!Number.isFinite(Number(price)) || Number(price) < 0)) {
          throw new TypeError(`第 ${index + 1} 条记录的入手价格式无效。`);
        }

        return {
          ...item,
          id: item.id ?? createId(),
          pieceCount: Number(item.pieceCount),
          price: String(price),
          status: typeof item.status === "string" ? item.status : "未拼装",
          notes: typeof item.notes === "string" ? item.notes : ""
        };
      }

      async function importData(file) {
        try {
          const parsed = JSON.parse(await file.text());
          if (!Array.isArray(parsed)) {
            throw new TypeError("文件内容应为套装记录数组。");
          }
          const importedSets = parsed.map(validateImportedSet);
          if (importedSets.length === 0) {
            throw new TypeError("文件中没有可导入的套装记录。");
          }
          if (saveSets([...sets, ...importedSets])) {
            showBackupMessage(`成功导入 ${importedSets.length} 件套装。`);
          } else {
            showBackupMessage("保存导入数据失败，请检查浏览器的本地存储设置。", true);
          }
        } catch (error) {
          showBackupMessage(`导入失败：${error instanceof SyntaxError ? "文件不是有效的 JSON。" : error.message}`, true);
        } finally {
          importFile.value = "";
        }
      }

      function appendText(parent, tagName, className, text) {
        const element = document.createElement(tagName);
        if (className) {
          element.className = className;
        }
        element.textContent = text;
        parent.append(element);
        return element;
      }

      function updateStats() {
        const total = sets.length;
        const pieces = sets.reduce((sum, set) => {
          const pieceCount = Number(set.pieceCount);
          return sum + (Number.isFinite(pieceCount) ? pieceCount : 0);
        }, 0);
        const cost = sets.reduce((sum, set) => {
          const value = String(set.price ?? "").trim();
          if (value === "") {
            return sum;
          }
          const numeric = Number(value);
          return sum + (Number.isFinite(numeric) ? numeric : 0);
        }, 0);

        totalStat.textContent = String(total);
        piecesStat.textContent = String(pieces);
        costStat.textContent = `¥${cost.toFixed(2)}`;
      }

      function renderSets() {
        updateStats();
        list.replaceChildren();
        count.textContent = `${sets.length} 件`;

        const selectedSeries = seriesFilter.value;
        const availableSeries = [...new Set(sets
          .map((set) => String(set.series ?? "").trim())
          .filter(Boolean))].sort((a, b) => a.localeCompare(b, "zh-CN"));
        seriesFilter.replaceChildren(new Option("全部系列", ""));
        availableSeries.forEach((series) => {
          seriesFilter.add(new Option(series, series));
        });
        if (availableSeries.includes(selectedSeries)) {
          seriesFilter.value = selectedSeries;
        }

        if (sets.length === 0) {
          const emptyState = document.createElement("div");
          emptyState.className = "empty-state";
          appendText(emptyState, "p", "", "还没有收藏套装，添加一条记录开始吧。");
          list.append(emptyState);
          return;
        }

        const query = searchInput.value.trim().toLocaleLowerCase();
        const matchingSets = sets
          .map((set, index) => ({ set, index }))
          .filter(({ set }) => {
            const matchesSearch = !query || [set.name, set.number]
              .some((value) => String(value ?? "").toLocaleLowerCase().includes(query));
            const matchesSeries = !seriesFilter.value || String(set.series ?? "").trim() === seriesFilter.value;
            return matchesSearch && matchesSeries;
          });

        if (matchingSets.length === 0) {
          const emptyState = document.createElement("div");
          emptyState.className = "empty-state";
          appendText(emptyState, "p", "", "没有找到符合条件的套装");
          list.append(emptyState);
          return;
        }

        matchingSets.forEach(({ set, index }) => {
          const card = document.createElement("article");
          card.className = "set-card";
          const content = document.createElement("div");
          content.className = "set-card-content";

          appendText(content, "h3", "", String(set.name ?? "未命名套装"));
          appendText(content, "p", "set-meta", `编号 ${String(set.number ?? "—")} · ${String(set.series ?? "—")}`);
          appendText(content, "p", "set-meta", `${String(set.pieceCount ?? "—")} 个零件 · 入手价 ${set.price === "" || set.price == null ? "未填写" : `¥${String(set.price)}`}`);
          appendText(content, "span", "set-status", String(set.status ?? "未拼装"));
          if (set.notes) {
            appendText(content, "p", "set-notes", `备注：${String(set.notes)}`);
          }

          const deleteButton = document.createElement("button");
          deleteButton.className = "delete-button";
          deleteButton.type = "button";
          deleteButton.textContent = "删除";
          deleteButton.setAttribute("aria-label", `删除套装：${String(set.name ?? "未命名套装")}`);
          deleteButton.addEventListener("click", () => {
            const nextSets = sets.filter((_, setIndex) => setIndex !== index);
            saveSets(nextSets);
          });

          card.append(content, deleteButton);
          list.append(card);
        });
      }

      form.addEventListener("submit", (event) => {
        event.preventDefault();
        formMessage.textContent = "";
        if (!validate()) {
          const firstInvalid = form.querySelector('[aria-invalid="true"]');
          if (firstInvalid) {
            firstInvalid.focus();
          }
          return;
        }

        const newSet = {
          id: createId(),
          name: getValue("name"),
          number: getValue("number"),
          series: getSeriesValue(),
          pieceCount: Number(getValue("pieceCount")),
          price: getValue("price"),
          status: form.elements.status.value,
          notes: getValue("notes")
        };

        if (saveSets([newSet, ...sets])) {
          form.reset();
          updateCustomSeriesField();
          fieldNames.forEach((name) => setError(name, ""));
          form.elements.name.focus();
        }
      });

      seriesSelect.addEventListener("change", () => {
        updateCustomSeriesField();
        setError("series", "");
      });

      searchInput.addEventListener("input", renderSets);
      seriesFilter.addEventListener("change", renderSets);
      document.getElementById("export-json").addEventListener("click", exportJson);
      document.getElementById("export-csv").addEventListener("click", exportData);
      document.getElementById("import-data").addEventListener("click", () => importFile.click());
      importFile.addEventListener("change", () => {
        if (importFile.files[0]) {
          importData(importFile.files[0]);
        }
      });

      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        const userName = loginUsername.value.trim();
        if (!userName) {
          loginError.textContent = "请输入用户名";
          loginUsername.focus();
          return;
        }

        if (loginPassword.value !== LOGIN_PASSPHRASE) {
          loginError.textContent = "口令错误，请重试";
          loginPassword.focus();
          return;
        }

        try {
          sessionStorage.setItem("currentUser", userName);
          loginError.textContent = "";
          enterUser(userName);
        } catch (error) {
          console.warn("无法保存当前登录状态。", error);
          loginError.textContent = "登录状态保存失败，请检查浏览器的会话存储设置。";
        }
      });

      document.getElementById("logout-button").addEventListener("click", () => {
        try {
          sessionStorage.removeItem("currentUser");
          window.location.reload();
        } catch (error) {
          console.warn("无法清除当前登录状态。", error);
          backupMessage.textContent = "登出失败，请重试。";
          backupMessage.classList.add("error");
        }
      });

      let savedUser = "";
      try {
        savedUser = (sessionStorage.getItem("currentUser") || "").trim();
      } catch (error) {
        console.warn("无法读取当前登录状态，请重新登录。", error);
      }

      if (savedUser) {
        enterUser(savedUser);
      } else {
        loginOverlay.hidden = false;
        appMain.hidden = true;
      }
    })();
