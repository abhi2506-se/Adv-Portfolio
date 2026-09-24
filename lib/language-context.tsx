'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'

export type Language = 'en' | 'hi' | 'haryanvi' | 'de'

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: string) => string
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

// Comprehensive translations
export const translations = {
  en: {
    // Navigation
    'nav.about': 'About',
    'nav.skills': 'Skills',
    'nav.experience': 'Experience',
    'nav.projects': 'Projects',
    'nav.devops': 'DevOps',
    'nav.blog': 'Blog',
    'nav.contact': 'Contact',
    'nav.audit': 'Audit',
    'nav.journey': 'Journey',
    'nav.languages': 'Languages',
    
    // Language Switcher
    'lang.select': 'Language',
    'lang.english': 'English',
    'lang.hindi': 'Hindi',
    'lang.haryanvi': 'Haryanvi',
    'lang.german': 'German',
    
    // Languages Page
    'languages.title': 'Languages I Know & Learning',
    'languages.description': 'Explore the languages I speak and am currently learning',
    'languages.known': 'Languages I Know',
    'languages.learning': 'Languages I\'m Learning',
    'languages.daily_updates': 'Today\'s Learning',
    'languages.no_updates': 'No updates for today yet',
    'languages.exams': 'Level Exams',
    'languages.certificates': 'Certificates',
    'languages.level': 'Level',
    'languages.proficiency': 'Proficiency',
    'languages.learning_since': 'Learning Since',
    'languages.exam_cleared': 'Exam Cleared',
    'languages.score': 'Score',
    'languages.certificate_link': 'View Certificate',
    'languages.native': 'Native',
    'languages.fluent': 'Fluent',
    'languages.intermediate': 'Intermediate',
    'languages.beginner': 'Beginner',
    'languages.native_speaker': 'Native Speaker',
    
    // Common
    'common.date': 'Date',
    'common.status': 'Status',
    'common.cleared': 'Cleared',
    'common.pending': 'Pending',

    // Hero
    'hero.greeting': "Hey, I'm",
    'hero.im': 'I am',
    'hero.role.1': 'Software Engineer',
    'hero.role.2': 'Full Stack Developer',
    'hero.role.3': 'DevOps Engineer',
    'hero.role.4': 'Frontend Architect',
    'hero.role.5': 'React.js Expert',
    'hero.role.6': 'Node.js Developer',
    'hero.default_job': 'Software Engineer',
    'hero.default_education': 'University',
    'hero.default_location': 'India',
    'hero.default_subtitle': 'Crafting high-performance, scalable web applications with React, Next.js, Node.js and DevOps. Currently shipping features at Amazon Development Center India.',
    'hero.cta.resume': 'Download Resume',
    'hero.cta.schedule': 'Schedule Interview / Meeting',
    'hero.cta.hire': 'Hire Me',
    'hero.connect': 'Connect:',
    'hero.scroll': 'Scroll',

    // About
    'about.eyebrow': 'About Me',
    'about.title.who': 'Who I',
    'about.title.am': 'Am',
    'about.impact': 'Measurable Impact',
    'about.impact.refresh': 'Refresh impact metrics',
    'about.impact.none': 'No impact metrics added yet.',

    // Skills
    'skills.eyebrow': 'What I Know',
    'skills.title.skills': 'Skills &',
    'skills.title.expertise': 'Expertise',
    'skills.hint': '✨ Click any skill to see confidence level, last used date, and context.',
    'skills.confidence': 'Confidence',
    'skills.last_used': 'Last used:',
    'skills.tap': 'tap →',
    'skills.level.expert': 'Expert',
    'skills.level.mid': 'Mid',
    'skills.level.learning': 'Learning',

    // Experience
    'experience.eyebrow': 'My Journey',
    'experience.title.experience': 'Experience &',
    'experience.title.education': 'Education',
    'experience.work_experience': 'Work Experience',
    'experience.education_heading': 'Education',

    // Projects
    'projects.title.featured': 'Featured',
    'projects.title.projects': 'Projects',
    'projects.subtitle': 'A selection of projects that demonstrate my technical skills and problem-solving abilities.',
    'projects.filter.placeholder': 'Filter by tech or keyword…',
    'projects.filter.searching': 'Searching…',
    'projects.filter.filter': 'Filter',
    'projects.filter.no_results': 'No projects found matching',
    'projects.filter.show_all': 'Show all',
    'projects.featured_badge': 'FEATURED',
    'projects.case_study.problem': 'Problem',
    'projects.case_study.solution': 'Solution',
    'projects.case_study.results': 'Results',
    'projects.features.key_features': 'Key Features',
    'projects.ai.explanation': 'Recruiter Explanation',
    'projects.btn.view': 'View Project',
    'projects.btn.hide': 'Hide',
    'projects.btn.case_study': 'Case Study',
    'projects.btn.features': 'Features',
    'projects.btn.explain': 'Explain',

    // Blog
    'blog.eyebrow': 'Technical Writing',
    'blog.title.blog': 'Blog &',
    'blog.title.articles': 'Articles',
    'blog.subtitle': 'Deep-dives on React, full-stack architecture, DevOps, and lessons from building real products.',
    'blog.live': 'Live',
    'blog.trending': 'Trending',
    'blog.updated': 'Updated',
    'blog.read_more': 'Read more',
    'blog.coming_soon': 'Coming soon',

    // Contact
    'contact.eyebrow': 'Say Hello',
    'contact.title.get_in': 'Get In',
    'contact.title.touch': 'Touch',
    'contact.subtitle': "I'm always open to discussing new opportunities, interesting projects, or just having a conversation about technology.",
    'contact.form.title': 'Send a Message',
    'contact.form.autofilled': 'Name & email auto-filled from your account',
    'contact.form.name': 'Your Name',
    'contact.form.email': 'Email Address',
    'contact.form.subject': 'Subject',
    'contact.form.subject_placeholder': 'Project Inquiry / Job Opportunity / Quick Question',
    'contact.form.message': 'Message',
    'contact.form.message_placeholder': 'Tell me about your project or opportunity...',
    'contact.form.sending': 'Sending…',
    'contact.form.send': 'Send Message',
    'contact.form.sent': "Message sent! I'll get back to you soon.",
    'contact.form.error': 'Something went wrong. Please email me directly.',
    'contact.form.abuse1': 'Your message contains inappropriate language',
    'contact.form.abuse2': 'This message was',
    'contact.form.abuse3': 'not',
    'contact.form.abuse4': 'sent to Abhishek Singh due to violation of the Terms & Conditions.',
    'contact.method.location': 'Location',
    'contact.method.email': 'Email',
    'contact.method.linkedin': 'Connect on LinkedIn',
    'contact.method.github': 'Visit GitHub Profile',
    'contact.method.instagram': 'Follow on Instagram',
    'contact.method.facebook': 'Connect on Facebook',
    'contact.method.leetcode': 'View LeetCode Profile',

    // Footer
    'footer.nav_heading': 'Navigation',
    'footer.connect_heading': 'Connect',
    'footer.nav.home': 'Home',
    'footer.nav.about': 'About',
    'footer.nav.skills': 'Skills',
    'footer.nav.projects': 'Projects',
    'footer.nav.devops': 'DevOps',
    'footer.nav.contact': 'Contact',
    'footer.nav.journey': 'Journey',
    'footer.open_to_opportunities': 'Open to opportunities',
    'footer.made_with': 'Made with',
    'footer.rights': 'All rights reserved.',
    'footer.privacy_policy': 'Privacy Policy',
    'footer.terms_of_service': 'Terms of Service',
    'footer.back_to_top': 'Back to top',
  },
  hi: {
    // Navigation
    'nav.about': 'परिचय',
    'nav.skills': 'कौशल',
    'nav.experience': 'अनुभव',
    'nav.projects': 'प्रोजेक्ट्स',
    'nav.devops': 'DevOps',
    'nav.blog': 'ब्लॉग',
    'nav.contact': 'संपर्क',
    'nav.audit': 'ऑडिट',
    'nav.journey': 'यात्रा',
    'nav.languages': 'भाषाएं',
    
    // Language Switcher
    'lang.select': 'भाषा',
    'lang.english': 'अंग्रेजी',
    'lang.hindi': 'हिंदी',
    'lang.haryanvi': 'हरियाणवी',
    'lang.german': 'जर्मन',
    
    // Languages Page
    'languages.title': 'मुझे जो भाषाएं आती हैं और सीख रहा हूँ',
    'languages.description': 'मेरी बोली जाने वाली भाषाओं और वर्तमान में सीख रही भाषाओं का पता लगाएं',
    'languages.known': 'मुझे जो भाषाएं आती हैं',
    'languages.learning': 'मैं जो भाषाएं सीख रहा हूँ',
    'languages.daily_updates': 'आज की सीख',
    'languages.no_updates': 'आज के लिए अभी कोई अपडेट नहीं',
    'languages.exams': 'स्तर परीक्षाएं',
    'languages.certificates': 'प्रमाणपत्र',
    'languages.level': 'स्तर',
    'languages.proficiency': 'दक्षता',
    'languages.learning_since': 'सीख रहे हैं',
    'languages.exam_cleared': 'परीक्षा पास की',
    'languages.score': 'स्कोर',
    'languages.certificate_link': 'प्रमाणपत्र देखें',
    'languages.native': 'मातृभाषा',
    'languages.fluent': 'प्रवाहपूर्ण',
    'languages.intermediate': 'मध्यवर्ती',
    'languages.beginner': 'शुरुआती',
    'languages.native_speaker': 'मातृभाषी',
    
    // Common
    'common.date': 'तारीख',
    'common.status': 'स्थिति',
    'common.cleared': 'पास',
    'common.pending': 'लंबित',

    // Hero
    'hero.greeting': 'नमस्ते, मैं हूँ',
    'hero.im': 'मैं हूँ',
    'hero.role.1': 'सॉफ्टवेयर इंजीनियर',
    'hero.role.2': 'फुल स्टैक डेवलपर',
    'hero.role.3': 'DevOps इंजीनियर',
    'hero.role.4': 'फ्रंटएंड आर्किटेक्ट',
    'hero.role.5': 'React.js विशेषज्ञ',
    'hero.role.6': 'Node.js डेवलपर',
    'hero.default_job': 'सॉफ्टवेयर इंजीनियर',
    'hero.default_education': 'विश्वविद्यालय',
    'hero.default_location': 'भारत',
    'hero.default_subtitle': 'React, Next.js, Node.js और DevOps के साथ उच्च-प्रदर्शन, स्केलेबल वेब एप्लिकेशन बनाना। वर्तमान में Amazon Development Center India में फीचर्स शिप कर रहा हूँ।',
    'hero.cta.resume': 'रिज़्यूमे डाउनलोड करें',
    'hero.cta.schedule': 'इंटरव्यू / मीटिंग शेड्यूल करें',
    'hero.cta.hire': 'मुझे नियुक्त करें',
    'hero.connect': 'जुड़ें:',
    'hero.scroll': 'स्क्रॉल करें',

    // About
    'about.eyebrow': 'मेरे बारे में',
    'about.title.who': 'मैं कौन',
    'about.title.am': 'हूँ',
    'about.impact': 'मापने योग्य प्रभाव',
    'about.impact.refresh': 'प्रभाव मेट्रिक्स रिफ्रेश करें',
    'about.impact.none': 'अभी तक कोई इम्पैक्ट मेट्रिक्स नहीं जोड़ी गई हैं।',

    // Skills
    'skills.eyebrow': 'मैं क्या जानता हूँ',
    'skills.title.skills': 'कौशल और',
    'skills.title.expertise': 'विशेषज्ञता',
    'skills.hint': '✨ आत्मविश्वास स्तर, अंतिम उपयोग तिथि और संदर्भ देखने के लिए किसी भी कौशल पर क्लिक करें।',
    'skills.confidence': 'आत्मविश्वास',
    'skills.last_used': 'अंतिम बार उपयोग:',
    'skills.tap': 'टैप करें →',
    'skills.level.expert': 'विशेषज्ञ',
    'skills.level.mid': 'मध्यम',
    'skills.level.learning': 'सीख रहा हूँ',

    // Experience
    'experience.eyebrow': 'मेरी यात्रा',
    'experience.title.experience': 'अनुभव और',
    'experience.title.education': 'शिक्षा',
    'experience.work_experience': 'कार्य अनुभव',
    'experience.education_heading': 'शिक्षा',

    // Projects
    'projects.title.featured': 'विशेष',
    'projects.title.projects': 'प्रोजेक्ट्स',
    'projects.subtitle': 'ऐसे प्रोजेक्ट्स का चयन जो मेरे तकनीकी कौशल और समस्या-समाधान क्षमताओं को दर्शाते हैं।',
    'projects.filter.placeholder': 'तकनीक या कीवर्ड से फ़िल्टर करें…',
    'projects.filter.searching': 'खोज रहे हैं…',
    'projects.filter.filter': 'फ़िल्टर',
    'projects.filter.no_results': 'इससे मेल खाने वाला कोई प्रोजेक्ट नहीं मिला',
    'projects.filter.show_all': 'सभी दिखाएं',
    'projects.featured_badge': 'विशेष',
    'projects.case_study.problem': 'समस्या',
    'projects.case_study.solution': 'समाधान',
    'projects.case_study.results': 'परिणाम',
    'projects.features.key_features': 'मुख्य विशेषताएं',
    'projects.ai.explanation': 'रिक्रूटर स्पष्टीकरण',
    'projects.btn.view': 'प्रोजेक्ट देखें',
    'projects.btn.hide': 'छिपाएं',
    'projects.btn.case_study': 'केस स्टडी',
    'projects.btn.features': 'विशेषताएं',
    'projects.btn.explain': 'समझाएं',

    // Blog
    'blog.eyebrow': 'तकनीकी लेखन',
    'blog.title.blog': 'ब्लॉग और',
    'blog.title.articles': 'लेख',
    'blog.subtitle': 'React, फुल-स्टैक आर्किटेक्चर, DevOps और वास्तविक उत्पाद बनाने से मिले सबक पर गहन लेख।',
    'blog.live': 'लाइव',
    'blog.trending': 'ट्रेंडिंग',
    'blog.updated': 'अपडेट किया गया',
    'blog.read_more': 'और पढ़ें',
    'blog.coming_soon': 'जल्द आ रहा है',

    // Contact
    'contact.eyebrow': 'नमस्ते कहें',
    'contact.title.get_in': 'संपर्क',
    'contact.title.touch': 'करें',
    'contact.subtitle': 'मैं हमेशा नए अवसरों, दिलचस्प प्रोजेक्ट्स पर चर्चा करने या तकनीक के बारे में बातचीत करने के लिए उपलब्ध हूँ।',
    'contact.form.title': 'संदेश भेजें',
    'contact.form.autofilled': 'नाम और ईमेल आपके खाते से अपने आप भर गए हैं',
    'contact.form.name': 'आपका नाम',
    'contact.form.email': 'ईमेल पता',
    'contact.form.subject': 'विषय',
    'contact.form.subject_placeholder': 'प्रोजेक्ट पूछताछ / नौकरी का अवसर / त्वरित प्रश्न',
    'contact.form.message': 'संदेश',
    'contact.form.message_placeholder': 'अपने प्रोजेक्ट या अवसर के बारे में बताएं...',
    'contact.form.sending': 'भेजा जा रहा है…',
    'contact.form.send': 'संदेश भेजें',
    'contact.form.sent': 'संदेश भेज दिया गया! मैं जल्द ही आपसे संपर्क करूंगा।',
    'contact.form.error': 'कुछ गलत हो गया। कृपया मुझे सीधे ईमेल करें।',
    'contact.form.abuse1': 'आपके संदेश में अनुचित भाषा है',
    'contact.form.abuse2': 'यह संदेश',
    'contact.form.abuse3': 'नहीं',
    'contact.form.abuse4': 'नियम और शर्तों के उल्लंघन के कारण Abhishek Singh को नहीं भेजा गया।',
    'contact.method.location': 'स्थान',
    'contact.method.email': 'ईमेल',
    'contact.method.linkedin': 'LinkedIn पर जुड़ें',
    'contact.method.github': 'GitHub प्रोफ़ाइल देखें',
    'contact.method.instagram': 'Instagram पर फॉलो करें',
    'contact.method.facebook': 'Facebook पर जुड़ें',
    'contact.method.leetcode': 'LeetCode प्रोफ़ाइल देखें',

    // Footer
    'footer.nav_heading': 'नेविगेशन',
    'footer.connect_heading': 'जुड़ें',
    'footer.nav.home': 'होम',
    'footer.nav.about': 'परिचय',
    'footer.nav.skills': 'कौशल',
    'footer.nav.projects': 'प्रोजेक्ट्स',
    'footer.nav.devops': 'DevOps',
    'footer.nav.contact': 'संपर्क',
    'footer.nav.journey': 'यात्रा',
    'footer.open_to_opportunities': 'अवसरों के लिए उपलब्ध',
    'footer.made_with': 'के साथ बनाया गया',
    'footer.rights': 'सर्वाधिकार सुरक्षित।',
    'footer.privacy_policy': 'गोपनीयता नीति',
    'footer.terms_of_service': 'सेवा की शर्तें',
    'footer.back_to_top': 'ऊपर जाएं',
  },
  haryanvi: {
    // Navigation
    'nav.about': 'बारे में',
    'nav.skills': 'हुनर',
    'nav.experience': 'अनुभव',
    'nav.projects': 'प्रोजेक्ट्स',
    'nav.devops': 'DevOps',
    'nav.blog': 'ब्लॉग',
    'nav.contact': 'संपर्क',
    'nav.audit': 'ऑडिट',
    'nav.journey': 'यात्रा',
    'nav.languages': 'भाषा',
    
    // Language Switcher
    'lang.select': 'भाषा',
    'lang.english': 'अंग्रेजी',
    'lang.hindi': 'हिंदी',
    'lang.haryanvi': 'हरियाणवी',
    'lang.german': 'जर्मन',
    
    // Languages Page
    'languages.title': 'मेरी भाषा और सीखना',
    'languages.description': 'मेरी भाषा और वर्तमान में सीख रही भाषाओं का पता लगाएं',
    'languages.known': 'मेरी भाषा',
    'languages.learning': 'मैं सीख रहा हूँ',
    'languages.daily_updates': 'आज सीखा',
    'languages.no_updates': 'आज कुछ नहीं सीखा',
    'languages.exams': 'परीक्षा',
    'languages.certificates': 'सर्टिफिकेट',
    'languages.level': 'लेवल',
    'languages.proficiency': 'दक्षता',
    'languages.learning_since': 'सीख रहे हैं',
    'languages.exam_cleared': 'परीक्षा पास',
    'languages.score': 'अंक',
    'languages.certificate_link': 'सर्टिफिकेट देखें',
    'languages.native': 'अपनी भाषा',
    'languages.fluent': 'बोली',
    'languages.intermediate': 'मध्य',
    'languages.beginner': 'शुरुआत',
    'languages.native_speaker': 'अपनी भाषा बोलने वाला',
    
    // Common
    'common.date': 'तारीख',
    'common.status': 'स्थिति',
    'common.cleared': 'पास',
    'common.pending': 'इंतजार',

    // Hero
    'hero.greeting': 'राम राम, मैं सूं',
    'hero.im': 'मैं सूं',
    'hero.role.1': 'सॉफ्टवेयर इंजीनियर',
    'hero.role.2': 'फुल स्टैक डेवलपर',
    'hero.role.3': 'DevOps इंजीनियर',
    'hero.role.4': 'फ्रंटएंड आर्किटेक्ट',
    'hero.role.5': 'React.js एक्सपर्ट',
    'hero.role.6': 'Node.js डेवलपर',
    'hero.default_job': 'सॉफ्टवेयर इंजीनियर',
    'hero.default_education': 'यूनिवर्सिटी',
    'hero.default_location': 'भारत',
    'hero.default_subtitle': 'React, Next.js, Node.js अर DevOps तै हाई-परफॉर्मेंस, स्केलेबल वेब ऐप बणाणा। अबार Amazon Development Center India म्ह काम कर रया सूं।',
    'hero.cta.resume': 'रिज़्यूमे डाउनलोड करो',
    'hero.cta.schedule': 'इंटरव्यू / मीटिंग शेड्यूल करो',
    'hero.cta.hire': 'मन्नै नौकरी पै राखो',
    'hero.connect': 'जुड़ो:',
    'hero.scroll': 'स्क्रॉल करो',

    // About
    'about.eyebrow': 'मेरे बारे म्ह',
    'about.title.who': 'मैं कुण',
    'about.title.am': 'सूं',
    'about.impact': 'दिखणीय असर',
    'about.impact.refresh': 'असर मेट्रिक्स ताज्जा करो',
    'about.impact.none': 'अबार कोए इम्पैक्ट मेट्रिक्स ना जोड़ी।',

    // Skills
    'skills.eyebrow': 'मैं के जाणूं सूं',
    'skills.title.skills': 'हुनर अर',
    'skills.title.expertise': 'महारत',
    'skills.hint': '✨ भरोसे का स्तर, आखरी बार उपयोग अर संदर्भ देखण खात्तर किसे भी हुनर पै क्लिक करो।',
    'skills.confidence': 'भरोसा',
    'skills.last_used': 'आखरी बार:',
    'skills.tap': 'टैप करो →',
    'skills.level.expert': 'माहिर',
    'skills.level.mid': 'मध्यम',
    'skills.level.learning': 'सीख रया सूं',

    // Experience
    'experience.eyebrow': 'मेरी यात्रा',
    'experience.title.experience': 'अनुभव अर',
    'experience.title.education': 'शिक्षा',
    'experience.work_experience': 'काम का अनुभव',
    'experience.education_heading': 'शिक्षा',

    // Projects
    'projects.title.featured': 'खास',
    'projects.title.projects': 'प्रोजेक्ट्स',
    'projects.subtitle': 'इसे प्रोजेक्ट्स जो मेरी तकनीकी काबिलियत अर समस्या-समाधान क्षमता दिखावै सै।',
    'projects.filter.placeholder': 'तकनीक या कीवर्ड तै फ़िल्टर करो…',
    'projects.filter.searching': 'ढूंढ रया सूं…',
    'projects.filter.filter': 'फ़िल्टर',
    'projects.filter.no_results': 'इसते मिलता कोए प्रोजेक्ट कोनी मिल्या',
    'projects.filter.show_all': 'सारे दिखाओ',
    'projects.featured_badge': 'खास',
    'projects.case_study.problem': 'समस्या',
    'projects.case_study.solution': 'समाधान',
    'projects.case_study.results': 'नतीजे',
    'projects.features.key_features': 'खास बिशेषताएं',
    'projects.ai.explanation': 'रिक्रूटर बताण',
    'projects.btn.view': 'प्रोजेक्ट देखो',
    'projects.btn.hide': 'छिपाओ',
    'projects.btn.case_study': 'केस स्टडी',
    'projects.btn.features': 'बिशेषताएं',
    'projects.btn.explain': 'समझाओ',

    // Blog
    'blog.eyebrow': 'तकनीकी लेखन',
    'blog.title.blog': 'ब्लॉग अर',
    'blog.title.articles': 'लेख',
    'blog.subtitle': 'React, फुल-स्टैक आर्किटेक्चर, DevOps अर सच्चे प्रोडक्ट बणाण तै सीखी बात्तां पै गहरे लेख।',
    'blog.live': 'लाइव',
    'blog.trending': 'ट्रेंडिंग',
    'blog.updated': 'अपडेट होया',
    'blog.read_more': 'और पढ़ो',
    'blog.coming_soon': 'जल्दी आवैगा',

    // Contact
    'contact.eyebrow': 'राम राम बोलो',
    'contact.title.get_in': 'संपर्क',
    'contact.title.touch': 'करो',
    'contact.subtitle': 'मैं हमेशा नए मौके, दिलचस्प प्रोजेक्ट्स पै बात करण या तकनीक पै गप्प मारण खात्तर तैयार सूं।',
    'contact.form.title': 'संदेश भेजो',
    'contact.form.autofilled': 'नाम अर ईमेल थारे खाते तै अपने आप भर गे',
    'contact.form.name': 'थारा नाम',
    'contact.form.email': 'ईमेल पता',
    'contact.form.subject': 'विषय',
    'contact.form.subject_placeholder': 'प्रोजेक्ट पूछताछ / नौकरी का मौका / छोट्टा सवाल',
    'contact.form.message': 'संदेश',
    'contact.form.message_placeholder': 'अपणे प्रोजेक्ट या मौके के बारे म्ह बताओ...',
    'contact.form.sending': 'भेज्या जा रहा सै…',
    'contact.form.send': 'संदेश भेजो',
    'contact.form.sent': 'संदेश भेज दिया! मैं जल्दी थारे तै संपर्क करूंगा।',
    'contact.form.error': 'कुछ गलत हो गया। कृपया मन्नै सीधा ईमेल करो।',
    'contact.form.abuse1': 'थारे संदेश म्ह अनुचित भाषा सै',
    'contact.form.abuse2': 'यो संदेश',
    'contact.form.abuse3': 'कोनी',
    'contact.form.abuse4': 'नियम अर शर्तां के उल्लंघन के कारण Abhishek Singh ताहीं कोनी भेज्या गया।',
    'contact.method.location': 'जगह',
    'contact.method.email': 'ईमेल',
    'contact.method.linkedin': 'LinkedIn पै जुड़ो',
    'contact.method.github': 'GitHub प्रोफाइल देखो',
    'contact.method.instagram': 'Instagram पै फॉलो करो',
    'contact.method.facebook': 'Facebook पै जुड़ो',
    'contact.method.leetcode': 'LeetCode प्रोफाइल देखो',

    // Footer
    'footer.nav_heading': 'नेविगेशन',
    'footer.connect_heading': 'जुड़ो',
    'footer.nav.home': 'होम',
    'footer.nav.about': 'बारे म्ह',
    'footer.nav.skills': 'हुनर',
    'footer.nav.projects': 'प्रोजेक्ट्स',
    'footer.nav.devops': 'DevOps',
    'footer.nav.contact': 'संपर्क',
    'footer.nav.journey': 'यात्रा',
    'footer.open_to_opportunities': 'मौकां खात्तर तैयार',
    'footer.made_with': 'के साथ बणाया',
    'footer.rights': 'सारे हक सुरक्षित।',
    'footer.privacy_policy': 'गोपनीयता नीति',
    'footer.terms_of_service': 'सेवा की शर्तां',
    'footer.back_to_top': 'ऊप्पर जाओ',
  },
  de: {
    // Navigation
    'nav.about': 'Über',
    'nav.skills': 'Fähigkeiten',
    'nav.experience': 'Erfahrung',
    'nav.projects': 'Projekte',
    'nav.devops': 'DevOps',
    'nav.blog': 'Blog',
    'nav.contact': 'Kontakt',
    'nav.audit': 'Audit',
    'nav.journey': 'Reise',
    'nav.languages': 'Sprachen',
    
    // Language Switcher
    'lang.select': 'Sprache',
    'lang.english': 'Englisch',
    'lang.hindi': 'Hindi',
    'lang.haryanvi': 'Haryanvi',
    'lang.german': 'Deutsch',
    
    // Languages Page
    'languages.title': 'Sprachen, die ich kenne und lerne',
    'languages.description': 'Entdecke die Sprachen, die ich spreche und derzeit lerne',
    'languages.known': 'Sprachen, die ich kenne',
    'languages.learning': 'Sprachen, die ich lerne',
    'languages.daily_updates': 'Heutiges Lernen',
    'languages.no_updates': 'Keine Updates für heute',
    'languages.exams': 'Sprachprüfungen',
    'languages.certificates': 'Zertifikate',
    'languages.level': 'Niveau',
    'languages.proficiency': 'Beherrschung',
    'languages.learning_since': 'Lerne seit',
    'languages.exam_cleared': 'Prüfung bestanden',
    'languages.score': 'Punktzahl',
    'languages.certificate_link': 'Zertifikat anzeigen',
    'languages.native': 'Muttersprache',
    'languages.fluent': 'Fließend',
    'languages.intermediate': 'Mittelstufe',
    'languages.beginner': 'Anfänger',
    'languages.native_speaker': 'Muttersprachler',
    
    // Common
    'common.date': 'Datum',
    'common.status': 'Status',
    'common.cleared': 'Bestanden',
    'common.pending': 'Ausstehend',

    // Hero
    'hero.greeting': 'Hallo, ich bin',
    'hero.im': 'Ich bin',
    'hero.role.1': 'Software-Ingenieur',
    'hero.role.2': 'Full-Stack-Entwickler',
    'hero.role.3': 'DevOps-Ingenieur',
    'hero.role.4': 'Frontend-Architekt',
    'hero.role.5': 'React.js-Experte',
    'hero.role.6': 'Node.js-Entwickler',
    'hero.default_job': 'Software-Ingenieur',
    'hero.default_education': 'Universität',
    'hero.default_location': 'Indien',
    'hero.default_subtitle': 'Entwicklung leistungsstarker, skalierbarer Webanwendungen mit React, Next.js, Node.js und DevOps. Derzeit liefere ich Features beim Amazon Development Center India.',
    'hero.cta.resume': 'Lebenslauf herunterladen',
    'hero.cta.schedule': 'Interview / Meeting vereinbaren',
    'hero.cta.hire': 'Stell mich ein',
    'hero.connect': 'Verbinden:',
    'hero.scroll': 'Scrollen',

    // About
    'about.eyebrow': 'Über mich',
    'about.title.who': 'Wer ich',
    'about.title.am': 'bin',
    'about.impact': 'Messbare Wirkung',
    'about.impact.refresh': 'Wirkungskennzahlen aktualisieren',
    'about.impact.none': 'Noch keine Wirkungskennzahlen hinzugefügt.',

    // Skills
    'skills.eyebrow': 'Was ich kann',
    'skills.title.skills': 'Fähigkeiten &',
    'skills.title.expertise': 'Expertise',
    'skills.hint': '✨ Klicke auf eine Fähigkeit, um Konfidenzlevel, letzte Nutzung und Kontext zu sehen.',
    'skills.confidence': 'Konfidenz',
    'skills.last_used': 'Zuletzt verwendet:',
    'skills.tap': 'tippen →',
    'skills.level.expert': 'Experte',
    'skills.level.mid': 'Mittel',
    'skills.level.learning': 'Lernend',

    // Experience
    'experience.eyebrow': 'Mein Werdegang',
    'experience.title.experience': 'Erfahrung &',
    'experience.title.education': 'Ausbildung',
    'experience.work_experience': 'Berufserfahrung',
    'experience.education_heading': 'Ausbildung',

    // Projects
    'projects.title.featured': 'Ausgewählte',
    'projects.title.projects': 'Projekte',
    'projects.subtitle': 'Eine Auswahl an Projekten, die meine technischen Fähigkeiten und Problemlösungskompetenz zeigen.',
    'projects.filter.placeholder': 'Nach Technologie oder Stichwort filtern…',
    'projects.filter.searching': 'Suche läuft…',
    'projects.filter.filter': 'Filtern',
    'projects.filter.no_results': 'Keine passenden Projekte gefunden für',
    'projects.filter.show_all': 'Alle anzeigen',
    'projects.featured_badge': 'HERVORGEHOBEN',
    'projects.case_study.problem': 'Problem',
    'projects.case_study.solution': 'Lösung',
    'projects.case_study.results': 'Ergebnisse',
    'projects.features.key_features': 'Hauptmerkmale',
    'projects.ai.explanation': 'Erklärung für Recruiter',
    'projects.btn.view': 'Projekt ansehen',
    'projects.btn.hide': 'Verbergen',
    'projects.btn.case_study': 'Fallstudie',
    'projects.btn.features': 'Funktionen',
    'projects.btn.explain': 'Erklären',

    // Blog
    'blog.eyebrow': 'Technisches Schreiben',
    'blog.title.blog': 'Blog &',
    'blog.title.articles': 'Artikel',
    'blog.subtitle': 'Tiefgehende Beiträge zu React, Full-Stack-Architektur, DevOps und Erkenntnissen aus echten Produkten.',
    'blog.live': 'Live',
    'blog.trending': 'Angesagt',
    'blog.updated': 'Aktualisiert',
    'blog.read_more': 'Weiterlesen',
    'blog.coming_soon': 'Demnächst',

    // Contact
    'contact.eyebrow': 'Hallo sagen',
    'contact.title.get_in': 'Kontakt',
    'contact.title.touch': 'aufnehmen',
    'contact.subtitle': 'Ich bin immer offen für neue Möglichkeiten, interessante Projekte oder ein Gespräch über Technologie.',
    'contact.form.title': 'Nachricht senden',
    'contact.form.autofilled': 'Name & E-Mail automatisch aus deinem Konto ausgefüllt',
    'contact.form.name': 'Dein Name',
    'contact.form.email': 'E-Mail-Adresse',
    'contact.form.subject': 'Betreff',
    'contact.form.subject_placeholder': 'Projektanfrage / Jobangebot / Kurze Frage',
    'contact.form.message': 'Nachricht',
    'contact.form.message_placeholder': 'Erzähl mir von deinem Projekt oder deiner Anfrage...',
    'contact.form.sending': 'Wird gesendet…',
    'contact.form.send': 'Nachricht senden',
    'contact.form.sent': 'Nachricht gesendet! Ich melde mich bald bei dir.',
    'contact.form.error': 'Etwas ist schiefgelaufen. Bitte schreib mir direkt eine E-Mail.',
    'contact.form.abuse1': 'Deine Nachricht enthält unangemessene Sprache',
    'contact.form.abuse2': 'Diese Nachricht wurde',
    'contact.form.abuse3': 'nicht',
    'contact.form.abuse4': 'aufgrund eines Verstoßes gegen die Nutzungsbedingungen an Abhishek Singh gesendet.',
    'contact.method.location': 'Standort',
    'contact.method.email': 'E-Mail',
    'contact.method.linkedin': 'Auf LinkedIn verbinden',
    'contact.method.github': 'GitHub-Profil besuchen',
    'contact.method.instagram': 'Auf Instagram folgen',
    'contact.method.facebook': 'Auf Facebook verbinden',
    'contact.method.leetcode': 'LeetCode-Profil ansehen',

    // Footer
    'footer.nav_heading': 'Navigation',
    'footer.connect_heading': 'Verbinden',
    'footer.nav.home': 'Start',
    'footer.nav.about': 'Über',
    'footer.nav.skills': 'Fähigkeiten',
    'footer.nav.projects': 'Projekte',
    'footer.nav.devops': 'DevOps',
    'footer.nav.contact': 'Kontakt',
    'footer.nav.journey': 'Werdegang',
    'footer.open_to_opportunities': 'Offen für neue Möglichkeiten',
    'footer.made_with': 'Erstellt mit',
    'footer.rights': 'Alle Rechte vorbehalten.',
    'footer.privacy_policy': 'Datenschutzerklärung',
    'footer.terms_of_service': 'Nutzungsbedingungen',
    'footer.back_to_top': 'Nach oben',
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('en')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Load language from localStorage
    try {
      const saved = localStorage.getItem('portfolio_language') as Language | null
      if (saved && Object.keys(translations).includes(saved)) {
        setLanguageState(saved)
      }
    } catch {}
    setMounted(true)
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem('portfolio_language', lang)
    } catch {}
  }

  const t = (key: string): string => {
    const langTranslations = translations[language]
    return (langTranslations as any)[key] || key
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

const fallbackT = (key: string): string =>
  (translations['en'] as any)[key] ?? key

const fallbackContext: LanguageContextType = {
  language: 'en',
  setLanguage: () => {},
  t: fallbackT,
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext)
  // Return safe fallback during SSR / pages outside the provider (e.g. /_not-found)
  return context ?? fallbackContext
}
