export type Language = "uz" | "en";

export const translations = {
  uz: {
    nav: {
      dashboard: "Boshqaruv Paneli",
      reception: "Qabulxona (Reception)",
      rooms: "Xonalar Fondi",
      housekeeping: "Tozalash (Cleaning)",
      guests: "Mehmonlar Bazasi",
      finance: "Hisob-Kitob (Bank)",
      revenue: "Narxlash (Revenue)",
      hr: "Xodimlar (HR)",
      restaurant: "Restoran (F&B)",
      inventory: "Omborxona",
      marketing: "Aksiyalar & Fikrlar",
      reports: "Hisobotlar (BI)",
      settings: "Tizim Sozlamalari",
      front: "Oперация (Front)",
      crm: "CRM & Moliya",
      hr_moddiy: "HR & Moddiy",
      quality: "Sifat & Marketing",
    },
    dashboard: {
      pms_center: "PMS Boshqaruv Markazi",
      staff_panel: "Xodim Ishchi Paneli",
      metrics_active: "Tizim ko'rsatkichlari faol.",
      arrivals_today: "Bugun Keladi",
      departures_today: "Bugun Ketadi",
      room_status: "Xona Holatlari",
      inventory_alerts: "Omborxona Alerts",
      low_stock: "Kam qolgan tovarlar",
      recent_activity: "Oxirgi Faolliklar",
      view_all: "Hammasini Ko'rish",
      no_data: "Ma'lumot yo'q",
      no_data_desc: "Yangi bandlovlar bo'lganda shu yerda xabar chiqadi.",
      quick_links: "Tezkor Havolalar",
      new_booking: "Yangi Bron (Kash)",
      room_available: "Bo'sh",
      room_occupied: "Band",
      room_cleaning: "Tozalash",
      pms_ad_title: "Mehmonxonangizni SafarTrip bilan boshqaring",
      pms_ad_desc: "Barcha tizimlar (Omborxona, HR, Kassa) bir joyda va doimiy yangilanib turadi.",
      view_docs: "Hujjatlarni Ko'rish",
      system: "Tizim",
      system_error: "Tizim xatosi",
      try_again: "Qayta urinib ko'rish",
      hotel_fallback: "Mehmonxona",
      pms_prefix: "Professional PMS"
    },
    hr: {
      title: "Xodimlar boshqaruvi (HR)",
      subtitle: "Jamoa a'zolarini boshqarish, rollar va panelga kirish huquqlari",
      total_team: "Jami Jamoa",
      active_staff: "Faol Xodimlar",
      departments: "Bo'limlar",
      new_notification: "Yangi Bildirishnoma",
      add_staff: "Yangi Xodim",
      table: {
         name: "Xodim Ismi",
         role: "Roli / Bo'limi",
         contact: "Kontakt (Login)",
         status: "Status",
         action: "Amal",
         email_na: "Email yo'q",
         phone_na: "Telefon yo'q"
      },
      status: {
         active: "Smenada",
         inactive: "Faol emas"
      },
      modal: {
         add_title: "Yangi Xodim Qo'shish",
         edit_title: "Xodimni Tahrirlash",
         first_name: "Ism *",
         last_name: "Familiya",
         email: "Email (Login) *",
         phone: "Telefon",
         role: "Vazifasi / Roli",
         cancel: "Bekor qilish",
         save: "Saqlash",
         add_btn: "Xodimni Qo'shish",
         login_ready: "Login ma'lumotlari tayyor!",
         login_desc: "Xodim endi o'z e-pochtasi va quyidagi parol orqali tizimga kirishi mumkin:",
         temp_pass: "Vaqtincha Parol",
         got_it: "Tushunarli, Yakunlash",
         warning: "Bu parolni xodimga bering. U keyinchalik buni o'zgartira oladi.",
         confirm_delete: "Haqiqatdan ham ushbu xodimni o'chirmoqchimisiz?",
         delete_success: "Xodim o'chirildi",
         add_success: "Xodim muvaffaqiyatli qo'shildi!",
         update_success: "Xodim ma'lumotlari yangilandi"
      }
    },
    reception: {
      title: "Qabulxona (Reception)",
      subtitle: "Mehmonlarni kutib olish va bandlovlarni boshqarish",
      new_booking: "Yangi Bandlov",
      board: "Doska",
      table: "Jadval",
      search_placeholder: "Mehmon ismi yoxud tel...",
      filters: {
        all: "Barcha Holatlar",
        pending: "Kutilayotganlar",
        confirmed: "Tasdiqlangan",
        staying: "Xonada (Yashayotgan)",
        completed: "Ketgan / Yakunlangan"
      },
      board_columns: {
        pending: "Kutilmoqda",
        staying: "Yashayotganlar",
        completed: "Yakunlanganlar",
        empty: {
          pending: "Kutilayotganlar yo'q",
          staying: "Hech kim yo'q",
          completed: "Tarix bo'sh"
        }
      },
      card: {
        nights: "Kecha",
        check_in: "Keldi (In)",
        check_out: "Ketdi (Out)",
        done: "Yakunlandi"
      },
      table_headers: {
         name: "Mehmon Ismi / Tel",
         date: "Sana va Muddat",
         room: "Xona / Toifa",
         payment: "To'lov Holati",
         status: "Holati"
      },
      table_content: {
         total_paid: "To'liq to'langan",
         debt: "Qarz",
         no_data: "Hech qanday ma'lumot topilmadi"
      },
      pagination: {
         showing: "Jami {total} tadan {count} tasi ko'rsatilmoqda",
         page: "Sahifa"
      },
      modal: {
         title: "Yangi Bandlov Yaratish",
         subtitle: "Rezervatsiya ma'lumotlarini kiriting",
         guest_info: "Mehmon Haqida",
         passport_info: "Pasport Ma'lumotlari",
         stay_info: "Joylashuv Ma'lumotlari",
         payment_info: "To'lov Ma'lumotlari",
         name: "To'liq Ismi *",
         phone: "Telefon Raqami",
         passport_series: "Seriya",
         passport_number: "Raqam",
         nationality: "Fuqaroligi",
         birth_date: "Tug'ilgan Sanasi",
         room_type: "Xona Toifasi *",
         check_in: "Check-In *",
         check_out: "Check-Out *",
         room_count: "Xonalar Soni",
         total_amount: "Jami Summa",
         paid_amount: "Avans / To'landi",
         avail_checking: "Tekshirilmoqda...",
         avail_ok: "Joy Mavjud ({count} ta bo'sh)",
         avail_fail: "Joy yetarli emas!",
         avail_stats: "Jami {total} xonadan {reserved} tasi band qilingan.",
         confirm_delete: "O'chirishni tasdiqlaysizmi?",
         confirm_btn: "Bandlovni Tasdiqlash",
         delete_btn: "O'chirib tashlash",
         cancel_btn: "Bekor qilish",
         add_guest: "Yangi mehmon qo'shish",
         is_child: "Yosh bola (Metirka)",
         guest_index: "{index}-mehmon",
         info_note: "Tasdiqlangandan so'ng mehmon bazaga qo'shiladi"
      },
      toasts: {
         status_updated: "Holat yangilandi!",
         status_error: "Holatni yangilab bo'lmadi",
         save_success: "Bandlov saqlandi!",
         save_error: "Xatolik yuz berdi",
         no_rooms: "Bo'sh xonalar yetarli emas!",
         delete_success: "Bandlov o'chirildi",
         delete_error: "O'chirishda xatolik"
      },
      statuses: {
        PENDING: "Kutilmoqda",
        CONFIRMED: "Tasdiqlangan",
        CHECKED_IN: "Keldi (In)",
        CHECKED_OUT: "Ketdi (Out)",
        COMPLETED: "Yakunlandi",
        CANCELLED: "Bekor qilingan",
        NO_SHOW: "Kelmagan"
      }
    },
    finance: {
      title: "Moliya va To'lovlar",
      subtitle: "Rejaviy tushumlar, qarzdorliklar (Folio) va Invoys boshqaruvi",
      stats: {
        expected: "Jami Kutilayotgan",
        actual: "Haqiqiy Tushumlar",
        debt: "Qarz / Qo'shimcha Folio",
        additional: "Restoran & Minibar"
      },
      search_placeholder: "Mehmon ismi bo'yicha... (Faqat faollar)",
      table: {
        guest: "Xost (Mehmon)",
        folio_status: "Folio Holati (Balans)",
        paid: "To'langan (Tushum)",
        actions: "Faol Tahrir",
        manage: "Boshqarish",
        no_data: "Faol moliyaviy hisoblar yo'q.",
        room_cost: "Xona narxi",
        extra: "Qo'shimcha (Folio)",
        total_debt: "Jami Qarz",
        remains: "Qoldiq",
        settled: "Yopilgan",
        overpaid: "Ortiqcha To'lov",
        room_fallback: "Xona"
      },
      modal: {
        title: "{name} hisobi (Folio)",
        tab_payment: "To'lov Qabuli",
        tab_charge: "Qarz / Xarajat",
        amount_payment: "To'lanayotgan Summa",
        amount_charge: "Xarajat Summasi",
        method: "To'lov Turi",
        category: "Xarajat Kategoriyasi",
        notes: "Izoh (Muhim)",
        notes_placeholder: "Masalan: 2 ta Pepsi va chipslar",
        submit_payment: "Kassaga Kirim Qilish",
        submit_charge: "Mijoz xisobiga (Folio) Qo'shish"
      },
      methods: {
        CASH: "Naqd pul",
        CARD: "Plastik Karta (Terminal)",
        TRANSFER: "Hisob raqami (Perekisleniye)"
      },
      categories: {
        MINIBAR: "Minibar (Ichimliklar)",
        RESTAURANT: "Restoran / Ovqat",
        LAUNDRY: "Kir yuvish xizmati",
        DAMAGES: "Zarar (Jarima yoxud Buzilgan Jixoz)"
      },
      invoice: {
        title: "Hisob-Faktura",
        date: "Sana",
        to: "Kimga (Mijoz)",
        status: "To'lov Holati",
        unpaid: "QARZDORLIK MAVJUD",
        paid: "TO'LIQ TO'LANGAN",
        item_name: "Xizmat nomi",
        item_total: "Summa",
        rent: "Xonalar ijarasi (Rezervatsiya)",
        total: "JAMI SUMMA",
        paid_label: "TO'LANGAN",
        balance: "BALANS",
        footer: "Xizmatlarimizdan foydalanganingiz uchun rahmat! Safariingiz behatar bo'lsin.",
        signature: "Mas'ul xodim imzosi / Pechat"
      },
      toasts: {
         payment_success: "To'lov qabul qilindi",
         charge_success: "Qarz (Folio) qo'shildi"
      }
    },
    settings: {
      title: "Tizim Sozlamalari",
      subtitle: "Shaxsiy profil va mehmonxona ma'lumotlari",
      tabs: {
        hotel: "Mehmonxona Profili",
        security: "Xavfsizlik (Parol)",
        billing: "Tariflar",
        notifications: "Bildirishnomalar"
      },
      hotel_info: "Mehmonxona ma'lumotlari",
      hotel_name: "Mehmonxona Nomi *",
      hotel_name_placeholder: "Mehmonxona nomi",
      city: "Shahar",
      phone: "Telefon",
      address: "Manzil",
      save_btn: "Saqlash",
      security_title: "Parolni o'zgartirish",
      current_pass: "Eski Parol",
      new_pass: "Yangi Parol",
      confirm_pass: "Parolni tasdiqlang",
      pass_hint: "Yangi parolingiz kamida 8 ta belgidan iborat bo'lishi va raqamlarni o'z ichiga olishi tavsiya etiladi.",
      pass_only_you: "Faqat o'zingizga ma'lum",
      update_btn: "Yangilash",
      toasts: {
        load_error: "Ma'lumotlarni yuklab bo'lmadi",
        save_success: "Ma'lumotlar saqlandi!",
        pass_mismatch: "Yangi parollar mos kelmadi",
        pass_success: "Parol yangilandi!"
      }
    },
    profile: {
      title: "Mehmonxona Profili",
      subtitle: "Mehmonxonangizning asosiy ma'lumotlarini yangilang",
      save_btn: "Saqlash",
      saving: "Saqlanmoqda...",
      saved: "Saqlandi!",
      placeholder_name: "Mehmonxona nomi",
      status: {
        draft: "Qoralama",
        active: "Aktiv",
        suspended: "To'xtatilgan"
      },
      sections: {
        basic: "Asosiy Ma'lumotlar",
        contact: "Aloqa Ma'lumotlari"
      },
      labels: {
        name: "Mehmonxona Nomi *",
        city: "Shahar / Hudud",
        address: "Aniq Manzil",
        email: "Email (Kontakt)",
        phone: "Telefon Raqami"
      },
      placeholders: {
        name: "Masalan: Grand Palace Hotel Zomin",
        city: "Masalan: Zomin, Jizzax",
        address: "Ko'cha, uy raqami...",
        email: "hotel@example.com",
        phone: "+998 90 123 45 67"
      },
      toasts: {
        success: "Profil muvaffaqiyatli yangilandi",
        error: "Xatolik"
      }
    },
    services: {
      rest: {
        title: "Restoran Servisi",
        subtitle: "Menyu boshqaruvi va POS buyurtma tizimi",
        manage_btn: "Menyuni Tahrirlash",
        finish_manage: "Tahrirlashni Yakunlash",
        add_item: "Yangi Mahsulot",
        loading_menu: "Menyu yuklanmoqda...",
        no_data: "Hozircha mahsulotlar yo'q",
        cart_title: "Buyurtma Savatasi",
        cart_empty: "Savat bo'sh",
        total_label: "Jami Summa:",
        checkout_btn: "Checkout",
        modal_checkout_title: "Buyurtmani To'lovini Tasdiqlash",
        pay_total: "To'lanadigan:",
        pay_method_label: "Qanday to'laydi?",
        pay_cash: "Kassa (Naqd)",
        folio_option: "Xonaga yozish (Folio)",
        table_number: "Stol Raqami",
        finish_order: "Buyurtmani Yakunlash",
        modal_item_title_add: "Yangi Mahsulot Qo'shish",
        modal_item_title_edit: "Mahsulotni Tahrirlash",
        item_name: "Nomi *",
        item_category: "Kategoriya",
        item_price: "Narxi *",
        item_desc: "Tavsifi",
        save_btn: "Saqlash",
        categories: {
           ALL: "Barchasi",
           MAIN: "Asosiy Taom",
           STARTER: "Gazak",
           DRINK: "Ichimlik",
           DESSERT: "Desert"
        },
        toasts: {
           order_success: "Buyurtma qabul qilindi!",
           save_success: "O'zgarishlar saqlandi",
           add_success: "Yangi mahsulot qo'shildi",
           status_updated: "Holat o'zgardi"
        }
      },
      inv: {
        title: "Omborxona Logistikasi",
        subtitle: "Mahsulotlar qoldiq'i, kirim-chiqim nazorati",
        add_item_btn: "Mahsulot Qo'shish",
        no_data: "Zaxirada mahsulotlar topilmadi",
        total_items: "Jami Mahsulotlar",
        low_stock: "Kamayayotganlar",
        search_placeholder: "Mahsulot nomi orqali...",
        table: {
          name: "Mahsulot Nomi",
          category: "Kategoriya",
          quantity: "Mavjud (Soni)",
          last_action: "Ohirgi Harakat",
          manage: "Harakat"
        },
        status_low: "Kam",
        action_in: "Kirim",
        action_out: "Chiqim",
        modal_add_title: "Yangi Mahsulot Qo'shish",
        form: {
          name: "Mahsulot Nomi *",
          category: "Kategoriya",
          unit: "Birligi",
          initial_stock: "Dastlabki Qoldiq",
          min_stock: "Minimal Qoldiq",
          save: "Mahsulotni Saqlash"
        },
        modal_trans_title: "Zaxirani Boshqarish",
        trans_form: {
          type_in: "Kirim",
          type_out: "Chiqim",
          amount: "Miqdori",
          notes: "Izoh (Muhim)",
          notes_placeholder: "Masalan: Yangi partiya keldi",
          submit: "Bajarish"
        },
        categories: {
          GENERAL: "Umumiy",
          FOOD: "Oziq-ovqat",
          CLEANING: "Tozalash jihozlari",
          OFFICE: "Ofis jihozlari"
        },
        units: {
          PCS: "Dona (Pcs)",
          KG: "Kilogram (Kg)",
          L: "Litr (L)",
          BOX: "Quti (Box)"
        },
        toasts: {
           add_success: "Mahsulot qo'shildi",
           update_success: "Zaxira yangilandi"
        }
      }
    },
    reports: {
       title: "Hisobotlar va Tahlillar",
       subtitle: "Mehmonxona faoliyati va moliyaviy natijalar xulosasi",
       loading: "Hisobot tayyorlanmoqda...",
       no_data: "Hozircha ma'lumot yo'q",
       export_excel: "Excelga Yuklash",
       export_pdf: "PDF (Chop etish)",
       excel_sheet: "Asosiy Hisobot",
       toast: {
         excel_ready: "Excel hisoboti tayyor!"
       },
       monthly_revenue: "Oylik Tushum Xulosasi",
       all_sectors: "Barcha Bo'limlar",
       monthly_kpis: "Oylik KPI ko'rsatkichlari",
       occupancy_label: "Bandlik (Occupancy)",
       adr_label: "ADR (O'rtacha Narx)",
       revpar_label: "RevPAR",
       operational_costs: "Operatsion Xarajatlar",
       staff_salaries: "Xodimlar Ish Haqi",
       logistics: "Logistika va Resurslar",
       net_profit: "Sof Foyda",
       headers: {
          date: "Sana",
          rooms: "Xonalar (Rooms)",
          fb: "Restoran (F&B)",
          total: "Jami Tushum"
       }
    },
    guests: {
      title: "Mehmonlar (CRM)",
      subtitle: "Yagona va doimiy mehmonlarga xizmat ko'rsatish",
      add_new: "Mijoz Qo'shish",
      stats: {
        total: "Jami Mijozlar",
        vip: "VIP / Doimiy",
        revenue: "Jami Tushum (LTV)"
      },
      search_placeholder: "Ism, familiya yoki telefon orqali izlash...",
      table: {
        name: "Mijoz Ismi",
        contact: "Aloqa ma'lumoti",
        status: "Status",
        visits: "Tashriflar",
        notes: "Qaydlar",
        no_data: "Mijozlar topilmadi.",
        no_notes: "Qayd yo'q",
        standard: "Standard",
        vip: "VIP"
      },
      modal: {
        title: "Yangi Mijoz Kiritish",
        first_name: "Ismi *",
        last_name: "Familiyasi",
        phone: "Telefon raqami",
        phone_placeholder: "+998 90 123 45 67",
        vip_status: "Imtiyoz Holati",
        vip_regular: "Standard (Oddiy)",
        vip_gold: "VIP Mijoz",
        notes: "Maxsus Eslatmalar",
        notes_placeholder: "Allergiya, yoqtirgan xonasi va h.k.",
        save_btn: "Saqlash"
      },
      toasts: {
        save_success: "Mijoz qo'shildi",
        save_error: "Xatolik qaytdi",
        network_error: "Ulanish xatosi"
      }
    },
    housekeeping: {
      title: "Housekeeping Markazi",
      subtitle_cleaner: "Sizga yuklatilgan vazifalar ro'yxati",
      subtitle_manager: "Xodimlarni boshqarish va xona holatlari nazorati",
      assign_task: "Vazifa Biriktirish",
      loading: "Ma'lumotlar olinmoqda",
      columns: {
        pending: "Kutilmoqda (Yangi)",
        in_progress: "Bajarilmoqda",
        done: "Tayyor / Yopilganlar"
      },
      task_card: {
        room: "Xona",
        unassigned: "Tayyinlanmagan",
        start_btn: "Boshlash",
        finish_btn: "Yakunlash",
        closed: "Vazifa Yopildi",
        no_tasks: "Vazifalar yo'q"
      },
      modal_assign: {
        title: "Yangi Vazifa Biriktirish",
        select_room: "Xona Tanlash",
        select_room_placeholder: "-- Tanlang --",
        select_staff: "Xodim (Ijrochi)",
        select_staff_placeholder: "-- Kim bajaradi? --",
        type: "Turi",
        priority: "Muhimlik",
        notes: "Izox (Vazifa matni)",
        notes_placeholder: "Masalan: Polni yuvish, sochiqlarni almashtirish...",
        submit: "Vazifani Yuborish"
      },
      modal_finish: {
        title: "Ish yakunlandi",
        subtitle: "Sarflangan ashyolarni belgilang",
        no_inventory: "Omborda housekeeping tovarlari yo'q",
        summary: "Sarf-xarajat xulosasi",
        back: "Orqaga",
        confirm: "Tasdiqlash"
      },
      types: {
        CLEANING: "Tozalash",
        MAINTENANCE: "Ta'mir",
        INSPECTION: "Tekshiruv"
      },
      priorities: {
        LOW: "Past",
        NORMAL: "O'rta",
        HIGH: "Yuqori",
        URGENT: "Zudlik bilan"
      },
      toasts: {
        update_success: "Muvaffaqiyatli yangilandi",
        update_error: "Xato yuz berdi",
        no_permission: "Ruxsat yo'q",
        delete_confirm: "Haqiqatan ham ushbu vazifani o'chirasizmi?",
        delete_success: "O'chirildi",
        assign_success: "Vazifa e'lon qilindi",
        assign_error: "Xatolik"
      }
    },
    rooms: {
      title: "Xonalar Ishchi Stoli",
      subtitle: "Toifalar, rasmlar va xonalar fondini boshqarish CRM moduli.",
      tabs: {
        types: "Toifalar",
        physical: "Xonalar Fondi"
      },
      search: {
        types: "Toifa nomi orqali qidirish...",
        physical: "Raqam yoki toifa bo'yicha..."
      },
      add_new: "Yangi qo'shish",
      table: {
        type_info: "Toifa va Ma'lumot",
        images: "Rasmlar",
        capacity: "Sig'im",
        base_price: "Baza Narx",
        rooms_count: "Fonddagi Xonalar",
        actions: "Amallar",
        room_number: "Xona Raqami",
        category: "Tegishli Toifa",
        floor: "Qavat",
        status: "Holati",
        no_data: "Bu yerda ma'lumot yo'q.",
        no_rooms: "Bitta ham xona biriktirilmagan.",
        loaded_count: "{count} ta yuklangan",
        linked_count: "{count} ta biriktirilgan",
        inactive: "NOFAOL"
      },
      status: {
        AVAILABLE: "Bo'sh",
        OCCUPIED: "Band",
        CLEANING: "Tozalanmoqda",
        MAINTENANCE: "Ta'mirda",
        BLOCKED: "G'iloflangan (Block)"
      },
      modal: {
        type_title_add: "Yangi Xona Toifasi Qo'shish",
        type_title_edit: "Toifani O'zgartirish",
        type_subtitle: "Turkum parametrlar",
        phy_title_add: "Fondga Xona Qo'shish",
        phy_title_edit: "Fondni Tahrirlash",
        phy_subtitle: "Asl fizik xona raqamini belgilang",
        name: "Toifa Nomi *",
        name_placeholder: "M-n: Deluxe Double Room",
        desc: "Tavsif (Xona ichida nimalar bor?)",
        desc_placeholder: "Mayda detallargacha yozishingiz mumkin...",
        adults: "Kattalar",
        children: "Bolalar",
        price: "Kunlik Narx *",
        images_label: "Onlayn Surati (URL lar orqali)",
        images_placeholder: "https://...",
        add_img: "Qo'shish",
        no_img: "Hali rasm ulanmagan.",
        active_label: "Platformada Ochiq",
        inactive_label: "Sotuvda ko'rinmaydi",
        active_phy: "Fondda bor va ishlatilmoqda",
        inactive_phy: "Xona zaxiradan olib tashlangan",
        save_btn: "Xotiraga Saqlash",
        close_btn: "Yopish",
        select_category: "Xona Toifasini Tanlang *",
        room_number: "Raqami *",
        floor: "Qavati",
        floor_placeholder: "1-qavat",
        status_label: "Fizik Holati"
      },
      toasts: {
        name_required: "Nomi kiritilishi shart",
        save_success: "Toifa saqlandi",
        delete_confirm_type: "Ushbu xona toifasini o'chirmoqchimisiz?",
        delete_success: "O'chirildi",
        type_required: "Oldin xona toifasi qo'shilishi kerak!",
        room_number_required: "Xona raqami bo'sh bo'lmaydi",
        room_save_success: "Saqlandi",
        delete_confirm_room: "Haqiqatdan bu xonani fonddan uzmoqchimisiz?"
      }
    },
    revenue: {
      title: "Daromad va Analitika",
      subtitle: "Biznes ko'rsatkichlari: Occupancy, ADR va RevPAR tahlili",
      loading: "Ma'lumotlar tahlil qilinmoqda...",
      metrics: {
        total_revenue: "Jami Daromad (30 kun)",
        adr: "O'rtacha Kunlik Narx (ADR)",
        occupancy: "Bandlik (Occupancy)",
        revpar: "RevPAR"
      },
      charts: {
        daily_revenue: "Oxirgi 7 kunlik Daromad",
        growth: "{percent}% O'sish",
        source_occupancy: "Manbalar bo'yicha Bandlik",
        no_data: "Ma'lumot mavjud emas"
      },
      insights: {
        seasonal: "Mavsumiy tahlillar shuni ko'rsatadiki, keyingi haftada bandlik {percent}% ga oshishi kutilmoqda."
      }
    },
    marketing: {
      title: "Marketing va Sodiqlik",
      subtitle: "Mijozlar fikri, brend nufuzi va aksiyalar boshqaruvi",
      add_feedback_btn: "Fikr Qo'shish",
      new_promo_btn: "Yangi Aksiya",
      metrics: {
        avg_rating: "O'rtacha Baho",
        total_feedbacks: "Jami {count} ta fikr",
        nps: "Sodiqlik (NPS)",
        nps_desc: "Ijobiy fikr bildirish koeffitsienti",
        active_promos: "Faol Aksiyalar",
        promo_unit: "ta"
      },
      feedback_list: {
        title: "Mehmonlar Fikrlari (Voice of Guest)",
        no_data: "Hech qanday fikr topilmadi."
      },
      loyalty: {
        title: "Loyalty Tizimi",
        subtitle: "Mijozlarni qayta jalb qilish uchun ballar tizimi va statuslar:",
        levels: {
          platinum: "Platinum",
          gold: "Gold",
          silver: "Silver"
        },
        visits: "{count}+ Tashrif",
        items_count: "{count} ta"
      },
      forms: {
        feedback: {
          title: "Fikr va Mulohaza Qoldirish",
          guest_name: "Mehmon Ismi *",
          rating: "Baho (1-5)",
          rating_unit: "{count} Yulduz",
          source: "Manbasi",
          sources: {
            DIRECT: "Tizim (Ichki)",
            GOOGLE: "Google Maps",
            TRIPADVISOR: "TripAdvisor"
          },
          comment: "Sharh (Comment)",
          comment_placeholder: "Mijoz nima deganini yozing...",
          save: "Saqlash"
        },
        promo: {
          title: "Yangi Aksiya Yaratish",
          name: "Aksiya nomi *",
          name_placeholder: "Masalan: Kuzgi Chegirma",
          code: "Promo Kod",
          discount: "Chegirma (%)",
          type: "Aksiya Turi",
          types: {
            SEASONAL: "Mavsumiy",
            EVENT: "Maxsus Tadbir",
            LOYALTY: "Sodiqlik Tizimi"
          },
          submit: "Aksiyani Faollashtirish"
        }
      },
      toasts: {
        feedback_success: "Fikr saqlandi!",
        promo_success: "{title} aksiyasi muvaffaqiyatli yaratildi!"
      }
    },
    common: {
      logout: "Chiqish",
      loading: "Yuklanmoqda...",
      refresh: "Yangilash",
      error: "Xatolik yuz berdi",
      search: "Qidiruv...",
      approved: "Tasdiqlangan",
      pending: "Ko'rib chiqilmoqda",
      guest: "Mehmon",
      amount: "Summa",
      city: "shahri",
      unit: "ta",
      room: "xona",
      currency: "so'm",
      select_placeholder: "Tanlang...",
      close: "Yopish",
      toasts: {
        logged_out: "Tizimdan chiqildi",
        save_success: "Muvaffaqiyatli saqlandi",
        error: "Xatolik yuz berdi"
      },
      roles: {
        admin: "Platforma Admini",
        hotel_manager: "Asosiy Manager",
        receptionist: "Qabulxona",
        cleaner: "Tozalash xodimi",
        waiter: "Ofitsiant",
        staff: "Xodim",
        owner: "Mehmonxona Egasi",
        view_auth_sim: "Vakolatni ko'rish (Sim)"
      },
      manager: "Manager",
      bottom_nav: {
        tasks: "Vazifalar",
        profile: "Profil",
        bookings: "Bandlovlar",
        rooms: "Xonalar",
        guests: "Mehmonlar",
        cleaning: "Tozalash",
        restaurant: "Restoran"
      }
    }
  },
  en: {
    nav: {
      dashboard: "Dashboard",
      reception: "Reception",
      rooms: "Room Fund",
      housekeeping: "Housekeeping",
      guests: "Guest Database",
      finance: "Finance (Bank)",
      revenue: "Revenue Management",
      hr: "Staff (HR)",
      restaurant: "Restaurant (F&B)",
      inventory: "Inventory",
      marketing: "Marketing & Campaigns",
      reports: "Reports (BI)",
      settings: "System Settings",
      front: "Operations (Front)",
      crm: "CRM & Finance",
      hr_moddiy: "HR & Stocks",
      quality: "Quality & Marketing",
    },
    dashboard: {
      pms_center: "PMS Control Center",
      staff_panel: "Staff Work Panel",
      metrics_active: "System metrics active.",
      arrivals_today: "Arrivals Today",
      departures_today: "Departures Today",
      room_status: "Room Status",
      inventory_alerts: "Inventory Alerts",
      low_stock: "Low Stock Items",
      recent_activity: "Recent Activity",
      view_all: "View All",
      no_data: "No data available",
      no_data_desc: "New bookings will appear here.",
      quick_links: "Quick Links",
      new_booking: "New Booking (Cash)",
      room_available: "Available",
      room_occupied: "Occupied",
      room_cleaning: "Cleaning",
      pms_ad_title: "Manage your hotel with SafarTrip",
      pms_ad_desc: "All systems (Warehouse, HR, POS) in one place and constantly updated.",
      view_docs: "View Documentation",
      system: "System",
      system_error: "System Error",
      try_again: "Try Again",
      hotel_fallback: "Hotel",
      pms_prefix: "Professional PMS"
    },
    hr: {
      title: "Staff Management (HR)",
      subtitle: "Manage team members, roles, and panel access rights",
      total_team: "Total Team",
      active_staff: "Active Staff",
      departments: "Departments",
      new_notification: "New Notification",
      add_staff: "New Employee",
      table: {
         name: "Employee Name",
         role: "Role / Department",
         contact: "Contact (Login)",
         status: "Status",
         action: "Action",
         email_na: "Email N/A",
         phone_na: "Phone N/A"
      },
      status: {
         active: "On Duty",
         inactive: "Inactive"
      },
      modal: {
         add_title: "Add New Employee",
         edit_title: "Edit Employee",
         first_name: "First Name *",
         last_name: "Last Name",
         email: "Email (Login) *",
         phone: "Phone",
         role: "Duty / Role",
         cancel: "Cancel",
         save: "Save Changes",
         add_btn: "Add Employee",
         login_ready: "Login Credentials Ready!",
         login_desc: "The employee can now log in using their email and the following password:",
         temp_pass: "Temporary Password",
         got_it: "Got it, Finish",
         warning: "Give this password to the employee. They can change it later.",
         confirm_delete: "Are you sure you want to delete this employee?",
         delete_success: "Employee deleted successfully",
         add_success: "Employee added successfully!",
         update_success: "Employee details updated"
      }
    },
    reception: {
      title: "Reception",
      subtitle: "Guest check-in and booking management",
      new_booking: "New Booking",
      board: "Board",
      table: "Table",
      search_placeholder: "Guest name or phone...",
      filters: {
        all: "All Statuses",
        pending: "Pending",
        confirmed: "Confirmed",
        staying: "Checked-in (Staying)",
        completed: "Checked-out / Completed"
      },
      board_columns: {
        pending: "Pending",
        staying: "Staying",
        completed: "Completed",
        empty: {
          pending: "No pending arrivals",
          staying: "No one staying",
          completed: "History empty"
        }
      },
      card: {
        nights: "Nights",
        check_in: "Check-in (In)",
        check_out: "Check-out (Out)",
        done: "Done"
      },
      table_headers: {
         name: "Guest Name / Phone",
         date: "Date & Duration",
         room: "Room / Category",
         payment: "Payment Status",
         status: "Status"
      },
      table_content: {
         total_paid: "Paid in full",
         debt: "Debt",
         no_data: "No data found"
      },
      pagination: {
         showing: "Showing {count} of {total} items",
         page: "Page"
      },
      modal: {
         title: "Create New Booking",
         subtitle: "Enter reservation details",
         guest_info: "Guest Information",
         passport_info: "Passport Information",
         stay_info: "Stay Information",
         payment_info: "Payment Information",
         name: "Full Name *",
         phone: "Phone Number",
         passport_series: "Series",
         passport_number: "Number",
         nationality: "Nationality",
         birth_date: "Birth Date",
         room_type: "Room Type *",
         check_in: "Check-In *",
         check_out: "Check-Out *",
         room_count: "Number of Rooms",
         total_amount: "Total Amount",
         paid_amount: "Advance / Paid",
         avail_checking: "Checking...",
         avail_ok: "Available ({count} free)",
         avail_fail: "Not enough rooms!",
         avail_stats: "{reserved} of {total} rooms reserved.",
         confirm_delete: "Are you sure you want to delete this?",
         confirm_btn: "Confirm Booking",
         delete_btn: "Delete Permanently",
         cancel_btn: "Cancel Booking",
         add_guest: "Add Guest",
         is_child: "Child (Birth Cert.)",
         guest_index: "Guest #{index}",
         info_note: "Guest will be added to database after confirmation"
      },
      toasts: {
         status_updated: "Status updated!",
         status_error: "Could not update status",
         save_success: "Booking saved!",
         save_error: "Error occurred",
         no_rooms: "Not enough rooms available!",
         delete_success: "Booking deleted",
         delete_error: "Error deleting booking"
      },
      statuses: {
        PENDING: "Pending",
        CONFIRMED: "Confirmed",
        CHECKED_IN: "Checked-in (In)",
        CHECKED_OUT: "Checked-out (Out)",
        COMPLETED: "Completed",
        CANCELLED: "Cancelled",
        NO_SHOW: "No Show"
      }
    },
    finance: {
      title: "Finance & Payments",
      subtitle: "Projected revenue, debts (Folio) and Invoice management",
      stats: {
        expected: "Total Expected",
        actual: "Actual Revenue",
        debt: "Debt / Extra Folio",
        additional: "Restaurant & Minibar"
      },
      search_placeholder: "Search by guest... (Active only)",
      table: {
        guest: "Guest (Host)",
        folio_status: "Folio Status (Balance)",
        paid: "Paid (Revenue)",
        actions: "Active Edit",
        manage: "Manage",
        no_data: "No active financial accounts.",
        room_cost: "Room Cost",
        extra: "Extra (Folio)",
        total_debt: "Total Debt",
        remains: "Remains",
        settled: "Settled",
        overpaid: "Overpaid",
        room_fallback: "Room"
      },
      modal: {
        title: "{name}'s Account (Folio)",
        tab_payment: "Accept Payment",
        tab_charge: "Add Expense",
        amount_payment: "Payment Amount",
        amount_charge: "Expense Amount",
        method: "Payment Method",
        category: "Expense Category",
        notes: "Note (Important)",
        notes_placeholder: "Example: 2 Pepsis and chips",
        submit_payment: "Record in Cashbox",
        submit_charge: "Add to Guest Folio"
      },
      methods: {
        CASH: "Cash",
        CARD: "Card (Terminal)",
        TRANSFER: "Bank Transfer"
      },
      categories: {
        MINIBAR: "Minibar",
        RESTAURANT: "Restaurant / Food",
        LAUNDRY: "Laundry Service",
        DAMAGES: "Damages (Fine/Broken)"
      },
      invoice: {
        title: "Invoice",
        date: "Date",
        to: "To (Guest)",
        status: "Payment Status",
        unpaid: "DEBT OUTSTANDING",
        paid: "PAID IN FULL",
        item_name: "Service Name",
        item_total: "Amount",
        rent: "Room Rent (Reservation)",
        total: "TOTAL AMOUNT",
        paid_label: "PAID",
        balance: "BALANCE",
        footer: "Thank you for using our services! Have a safe journey.",
        signature: "Responsible Staff Signature / Stamp"
      },
      toasts: {
         payment_success: "Payment accepted",
         charge_success: "Expense added to folio"
      }
    },
    settings: {
      title: "System Settings",
      subtitle: "Personal profile and hotel details",
      tabs: {
        hotel: "Hotel Profile",
        security: "Security (Password)",
        billing: "Tariffs",
        notifications: "Notifications"
      },
      hotel_info: "Hotel Information",
      hotel_name: "Hotel Name *",
      hotel_name_placeholder: "Hotel name",
      city: "City",
      phone: "Phone",
      address: "Address",
      save_btn: "Save",
      security_title: "Change Password",
      current_pass: "Current Password",
      new_pass: "New Password",
      confirm_pass: "Confirm New Password",
      pass_hint: "It is recommended that your new password consists of at least 8 characters and includes numbers.",
      pass_only_you: "Known only to you",
      update_btn: "Update",
      toasts: {
        load_error: "Failed to load data",
        save_success: "Settings saved!",
        pass_mismatch: "New passwords do not match",
        pass_success: "Password updated!"
      }
    },
    profile: {
      title: "Hotel Profile",
      subtitle: "Update your hotel's basic information",
      save_btn: "Save",
      saving: "Saving...",
      saved: "Saved!",
      placeholder_name: "Hotel name",
      status: {
        draft: "Draft",
        active: "Active",
        suspended: "Suspended"
      },
      sections: {
        basic: "Basic Information",
        contact: "Contact Information"
      },
      labels: {
        name: "Hotel Name *",
        city: "City / Region",
        address: "Exact Address",
        email: "Email (Contact)",
        phone: "Phone Number"
      },
      placeholders: {
        name: "Example: Grand Palace Hotel Zomin",
        city: "Example: Zomin, Jizzax",
        address: "Street, house number...",
        email: "hotel@example.com",
        phone: "+998 90 123 45 67"
      },
      toasts: {
        success: "Profile updated successfully",
        error: "An error occurred"
      }
    },
    services: {
      rest: {
        title: "Restaurant Service",
        subtitle: "Menu management and POS ordering system",
        manage_btn: "Edit Menu",
        finish_manage: "Finish Editing",
        add_item: "New Item",
        loading_menu: "Loading menu...",
        no_data: "No products found",
        cart_title: "Shopping Cart",
        cart_empty: "Cart is empty",
        total_label: "Total Amount:",
        checkout_btn: "Checkout",
        modal_checkout_title: "Confirm Order & Payment",
        pay_total: "Amount Due:",
        pay_method_label: "Payment Method",
        pay_cash: "Cashbox (Cash)",
        folio_option: "Charge to Room (Folio)",
        table_number: "Table Number",
        finish_order: "Finish Order",
        modal_item_title_add: "Add New Product",
        modal_item_title_edit: "Edit Product",
        item_name: "Name *",
        item_category: "Category",
        item_price: "Price *",
        item_desc: "Description",
        save_btn: "Save",
        categories: {
           ALL: "All",
           MAIN: "Main Course",
           STARTER: "Starter",
           DRINK: "Drink",
           DESSERT: "Dessert"
        },
        toasts: {
           order_success: "Order received!",
           save_success: "Changes saved",
           add_success: "New item added",
           status_updated: "Status updated"
        }
      },
      inv: {
        title: "Warehouse Logistics",
        subtitle: "Stock levels, inward-outward control",
        add_item_btn: "Add Product",
        no_data: "No products found in stock",
        total_items: "Total Products",
        low_stock: "Low Stock Items",
        search_placeholder: "Search by item name...",
        table: {
          name: "Product Name",
          category: "Category",
          quantity: "Available (Qty)",
          last_action: "Last Action",
          manage: "Action"
        },
        status_low: "Low",
        action_in: "In",
        action_out: "Out",
        modal_add_title: "Add New Product",
        form: {
          name: "Product Name *",
          category: "Category",
          unit: "Unit",
          initial_stock: "Initial Stock",
          min_stock: "Min Stock",
          save: "Save Product"
        },
        modal_trans_title: "Manage Stock",
        trans_form: {
          type_in: "Restock (In)",
          type_out: "Withdraw (Out)",
          amount: "Quantity",
          notes: "Note (Important)",
          notes_placeholder: "Example: New batch arrived",
          submit: "Submit"
        },
        categories: {
          GENERAL: "General",
          FOOD: "Food & Beverage",
          CLEANING: "Cleaning Supplies",
          OFFICE: "Office Supplies"
        },
        units: {
          PCS: "Pieces (Pcs)",
          KG: "Kilograms (Kg)",
          L: "Liters (L)",
          BOX: "Boxes"
        },
        toasts: {
           add_success: "Product added",
           update_success: "Stock updated"
        }
      }
    },
    reports: {
       title: "Reports & Analytics",
       subtitle: "Summary of hotel operations and financial results",
       loading: "Preparing report...",
       no_data: "No data available yet",
       export_excel: "Export to Excel",
       export_pdf: "PDF (Print)",
       excel_sheet: "General Report",
       toast: {
         excel_ready: "Excel report is ready!"
       },
       monthly_revenue: "Monthly Revenue Summary",
       all_sectors: "All Sectors",
       monthly_kpis: "Monthly KPI Metrics",
       occupancy_label: "Occupancy",
       adr_label: "ADR (Avg Daily Rate)",
       revpar_label: "RevPAR",
       operational_costs: "Operations Costs",
       staff_salaries: "Staff Salaries",
       logistics: "Logistics & Resources",
       net_profit: "Net Profit",
       headers: {
          date: "Date",
          rooms: "Rooms Revenue",
          fb: "Restaurant (F&B)",
          total: "Total Revenue"
       }
    },
    guests: {
      title: "Guests (CRM)",
      subtitle: "Service for single and regular guests",
      add_new: "Add Guest",
      stats: {
        total: "Total Guests",
        vip: "VIP / Regulars",
        revenue: "Total Revenue (LTV)"
      },
      search_placeholder: "Search by name, surname or phone...",
      table: {
        name: "Guest Name",
        contact: "Contact Info",
        status: "Status",
        visits: "Visits",
        notes: "Notes",
        no_data: "No guests found.",
        no_notes: "No notes",
        standard: "Standard",
        vip: "VIP"
      },
      modal: {
        title: "Enter New Guest",
        first_name: "Name *",
        last_name: "Surname",
        phone: "Phone number",
        phone_placeholder: "+998 90 123 45 67",
        vip_status: "VIP Status",
        vip_regular: "Standard (Regular)",
        vip_gold: "VIP Guest",
        notes: "Special Notes",
        notes_placeholder: "Allergies, favorite room, etc.",
        save_btn: "Save"
      },
      toasts: {
        save_success: "Guest added",
        save_error: "An error occurred",
        network_error: "Connection error"
      }
    },
    housekeeping: {
      title: "Housekeeping Center",
      subtitle_cleaner: "List of tasks assigned to you",
      subtitle_manager: "Staff management and room status control",
      assign_task: "Assign Task",
      loading: "Fetching data...",
      columns: {
        pending: "Pending (New)",
        in_progress: "In Progress",
        done: "Done / Closed"
      },
      task_card: {
        room: "Room",
        unassigned: "Unassigned",
        start_btn: "Start",
        finish_btn: "Finish",
        closed: "Task Closed",
        no_tasks: "No tasks"
      },
      modal_assign: {
        title: "Assign New Task",
        select_room: "Select Room",
        select_room_placeholder: "-- Select --",
        select_staff: "Employee (Assignee)",
        select_staff_placeholder: "-- Who will do it? --",
        type: "Type",
        priority: "Priority",
        notes: "Notes (Task text)",
        notes_placeholder: "e.g.: Mop floors, change towels...",
        submit: "Send Task"
      },
      modal_finish: {
        title: "Work Finished",
        subtitle: "Select consumed items",
        no_inventory: "No housekeeping items in warehouse",
        summary: "Consumption Summary",
        back: "Back",
        confirm: "Confirm"
      },
      types: {
        CLEANING: "Cleaning",
        MAINTENANCE: "Repair",
        INSPECTION: "Inspection"
      },
      priorities: {
        LOW: "Low",
        NORMAL: "Medium",
        HIGH: "High",
        URGENT: "Urgent"
      },
      toasts: {
        update_success: "Updated successfully",
        update_error: "Error occurred",
        no_permission: "No permission",
        delete_confirm: "Are you sure you want to delete this task?",
        delete_success: "Deleted",
        assign_success: "Task created",
        assign_error: "Error"
      }
    },
    rooms: {
      title: "Rooms Workspace",
      subtitle: "CRM module for managing categories, images, and room fund.",
      tabs: {
        types: "Categories",
        physical: "Room Fund"
      },
      search: {
        types: "Search by category name...",
        physical: "Search by number or category..."
      },
      add_new: "Add New",
      table: {
        type_info: "Category & Info",
        images: "Images",
        capacity: "Capacity",
        base_price: "Base Price",
        rooms_count: "Rooms in Fund",
        actions: "Actions",
        room_number: "Room Number",
        category: "Category",
        floor: "Floor",
        status: "Status",
        no_data: "No data available here.",
        no_rooms: "No rooms assigned yet.",
        loaded_count: "{count} uploaded",
        linked_count: "{count} linked",
        inactive: "INACTIVE"
      },
      status: {
        AVAILABLE: "Available",
        OCCUPIED: "Occupied",
        CLEANING: "Cleaning",
        MAINTENANCE: "Maintenance",
        BLOCKED: "Blocked"
      },
      modal: {
        type_title_add: "Add New Room Category",
        type_title_edit: "Edit Category",
        type_subtitle: "Category parameters",
        phy_title_add: "Add Room to Fund",
        phy_title_edit: "Edit Room in Fund",
        phy_subtitle: "Specify the actual physical room number",
        name: "Category Name *",
        name_placeholder: "e.g.: Deluxe Double Room",
        desc: "Description (What's in the room?)",
        desc_placeholder: "You can write down details here...",
        adults: "Adults",
        children: "Children",
        price: "Daily Price *",
        images_label: "Online Photos (via URLs)",
        images_placeholder: "https://...",
        add_img: "Add",
        no_img: "No images attached yet.",
        active_label: "Open on Platform",
        inactive_label: "Hidden from sale",
        active_phy: "In fund and active",
        inactive_phy: "Room removed from reserve",
        save_btn: "Save to Memory",
        close_btn: "Close",
        select_category: "Select Room Category *",
        room_number: "Number *",
        floor: "Floor",
        floor_placeholder: "1st floor",
        status_label: "Physical Status"
      },
      toasts: {
        name_required: "Name is required",
        save_success: "Category saved",
        delete_confirm_type: "Do you want to delete this room category?",
        delete_success: "Deleted successfully",
        type_required: "Room category must be added first!",
        room_number_required: "Room number cannot be empty",
        room_save_success: "Saved successfully",
        delete_confirm_room: "Are you sure you want to remove this room from the fund?"
      }
    },
    revenue: {
      title: "Revenue & Analytics",
      subtitle: "Business metrics: Occupancy, ADR and RevPAR analysis",
      loading: "Analyzing data...",
      metrics: {
        total_revenue: "Total Revenue (30 days)",
        adr: "Avg Daily Rate (ADR)",
        occupancy: "Occupancy",
        revpar: "RevPAR"
      },
      charts: {
        daily_revenue: "Last 7 Days Revenue",
        growth: "{percent}% Growth",
        source_occupancy: "Occupancy by Source",
        no_data: "No data available"
      },
      insights: {
        seasonal: "Seasonal analysis shows that occupancy is expected to increase by {percent}% next week."
      }
    },
    marketing: {
      title: "Marketing & Loyalty",
      subtitle: "Guest feedback, brand reputation, and campaign management",
      add_feedback_btn: "Add Feedback",
      new_promo_btn: "New Campaign",
      metrics: {
        avg_rating: "Average Rating",
        total_feedbacks: "Total {count} feedbacks",
        nps: "Loyalty (NPS)",
        nps_desc: "Positive feedback coefficient",
        active_promos: "Active Campaigns",
        promo_unit: "active"
      },
      feedback_list: {
        title: "Guest Feedback (Voice of Guest)",
        no_data: "No feedback found."
      },
      loyalty: {
        title: "Loyalty System",
        subtitle: "Points system and statuses to re-engage guests:",
        levels: {
          platinum: "Platinum",
          gold: "Gold",
          silver: "Silver"
        },
        visits: "{count}+ Visits",
        items_count: "{count} members"
      },
      forms: {
        feedback: {
          title: "Leave Feedback & Comments",
          guest_name: "Guest Name *",
          rating: "Rating (1-5)",
          rating_unit: "{count} Stars",
          source: "Source",
          sources: {
            DIRECT: "System (Internal)",
            GOOGLE: "Google Maps",
            TRIPADVISOR: "TripAdvisor"
          },
          comment: "Comment (Sharh)",
          comment_placeholder: "Write what the guest said...",
          save: "Save"
        },
        promo: {
          title: "Create New Campaign",
          name: "Campaign Name *",
          name_placeholder: "e.g., Autumn Discount",
          code: "Promo Code",
          discount: "Discount (%)",
          type: "Campaign Type",
          types: {
            SEASONAL: "Seasonal",
            EVENT: "Special Event",
            LOYALTY: "Loyalty Program"
          },
          submit: "Activate Campaign"
        }
      },
      toasts: {
        feedback_success: "Feedback saved!",
        promo_success: "{title} campaign successfully created!"
      }
    },
    common: {
      logout: "Logout",
      loading: "Loading...",
      refresh: "Refresh",
      error: "Error occurred",
      search: "Search...",
      approved: "Approved",
      pending: "Pending Review",
      guest: "Guest",
      amount: "Amount",
      city: "city",
      unit: "pcs",
      room: "room",
      currency: "UZS",
      select_placeholder: "Select...",
      close: "Close",
      toasts: {
        logged_out: "Logged out successfully",
        save_success: "Saved successfully",
        error: "An error occurred"
      },
      roles: {
        admin: "Platform Admin",
        hotel_manager: "General Manager",
        receptionist: "Receptionist",
        cleaner: "Housekeeper",
        waiter: "Waiter",
        staff: "Staff Member",
        owner: "Hotel Owner",
        view_auth_sim: "View Authority (Sim)"
      },
      manager: "Manager",
      bottom_nav: {
        tasks: "Tasks",
        profile: "Profile",
        bookings: "Bookings",
        rooms: "Rooms",
        guests: "Guests",
        cleaning: "Cleaning",
        restaurant: "Restaurant"
      }
    }
  }
};
